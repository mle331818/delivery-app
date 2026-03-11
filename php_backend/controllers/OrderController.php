<?php
class OrderController {
    public static function handle($routeParts) {
        $method = $_SERVER['REQUEST_METHOD'];
        $baseRoute = $routeParts[0]; // orders, favorites, or promos
        $action = $routeParts[1] ?? '';

        if ($baseRoute === 'favorites') {
            self::handleFavorites($method, $action);
            return;
        }

        if ($baseRoute === 'promos') {
            if ($method === 'POST' && $action === 'validate') {
                self::validatePromo();
            } else {
                self::notFound();
            }
            return;
        }

        if ($baseRoute === 'orders') {
            if ($method === 'POST' && empty($action)) {
                self::createOrder();
            } elseif ($method === 'GET' && $action === 'my-orders') {
                self::getMyOrders();
            } elseif ($method === 'GET' && !empty($action)) { // /orders/:id
                self::getOrderById($action);
            } else {
                self::notFound();
            }
        }
    }

    private static function notFound() {
        http_response_code(404);
        echo json_encode(['error' => 'Order endpoint not found']);
    }

    /* --- Favorites --- */
    private static function handleFavorites($method, $itemId) {
        $user = Auth::authenticateToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Access token required']);
            return;
        }

        $pdo = DB::getConnection();

        if ($method === 'GET') {
            $stmt = $pdo->prepare("SELECT mi.* FROM favorites f JOIN menu_items mi ON f.menu_item_id = mi.id WHERE f.user_id = ?");
            $stmt->execute([$user['id']]);
            $favorites = $stmt->fetchAll();
            foreach($favorites as &$fav) {
                $fav['price'] = (float)$fav['price'];
            }
            echo json_encode($favorites);
        } elseif ($method === 'POST' && $itemId) {
            $stmt = $pdo->prepare("INSERT OR IGNORE INTO favorites (user_id, menu_item_id) VALUES (?, ?)");
            $stmt->execute([$user['id'], $itemId]);
            echo json_encode(['success' => true]);
        } elseif ($method === 'DELETE' && $itemId) {
            $stmt = $pdo->prepare("DELETE FROM favorites WHERE user_id = ? AND menu_item_id = ?");
            $stmt->execute([$user['id'], $itemId]);
            echo json_encode(['success' => true]);
        }
    }

    /* --- Promos --- */
    private static function validatePromo() {
        $user = Auth::authenticateToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Access token required']);
            return;
        }

        $body = getJsonBody();
        $code = strtoupper($body['code'] ?? '');

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1");
        $stmt->execute([$code]);
        $promo = $stmt->fetch();

        if (!$promo) {
            http_response_code(404);
            echo json_encode(['error' => 'Invalid promo code']);
            return;
        }

        echo json_encode($promo);
    }

    /* --- Orders --- */
    private static function createOrder() {
        $user = Auth::authenticateToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Access token required']);
            return;
        }

        $body = getJsonBody();
        $items = $body['items'] ?? [];
        $deliveryAddress = $body['deliveryAddress'] ?? '';
        $deliveryPhone = $body['deliveryPhone'] ?? '';
        $promoCode = $body['promoCode'] ?? null;
        $scheduledFor = $body['scheduledFor'] ?? null;

        if (empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'Cart is empty']);
            return;
        }

        if (!$deliveryAddress || !$deliveryPhone) {
            http_response_code(400);
            echo json_encode(['error' => 'Delivery address and phone required']);
            return;
        }

        $pdo = DB::getConnection();
        
        // Calculate Totals
        $subtotal = 0;
        foreach ($items as $item) {
            $stmt = $pdo->prepare("SELECT price FROM menu_items WHERE id = ?");
            $stmt->execute([$item['menuItemId']]);
            $menuItem = $stmt->fetch();
            if (!$menuItem) {
                http_response_code(400);
                echo json_encode(['error' => "Item {$item['menuItemId']} not found"]);
                return;
            }
            $subtotal += $menuItem['price'] * $item['quantity'];
        }

        // Apply Promo
        $discountAmount = 0;
        $promoId = null;
        if ($promoCode) {
            $stmt = $pdo->prepare("SELECT * FROM promo_codes WHERE code = ? AND is_active = 1");
            $stmt->execute([$promoCode]);
            $promo = $stmt->fetch();
            if ($promo) {
                $discountAmount = $subtotal * ($promo['discount_percent'] / 100);
                $promoId = $promo['id'];
            }
        }

        $deliveryFee = 5.00;
        $tax = ($subtotal - $discountAmount) * 0.08;
        $total = ($subtotal - $discountAmount) + $deliveryFee + $tax;

        // Loyalty points
        $loyaltyRate = 1;
        $stmt = $pdo->query("SELECT value FROM settings WHERE key = 'loyalty_rate'");
        $setting = $stmt->fetch();
        if ($setting) $loyaltyRate = floatval($setting['value']);
        
        $pointsAwarded = floor($subtotal * $loyaltyRate);

        // Transaction for inserting order
        $pdo->beginTransaction();
        try {
            $orderId = 'order_' . round(microtime(true) * 1000);
            
            $stmt = $pdo->prepare("
                INSERT INTO orders (
                    id, customer_id, delivery_address, delivery_phone, subtotal, 
                    delivery_fee, tax, total, payment_status, points_awarded, 
                    promo_code_id, discount_amount, scheduled_for, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
            ");
            $stmt->execute([
                $orderId, $user['id'], $deliveryAddress, $deliveryPhone, $subtotal,
                $deliveryFee, $tax, $total, 'paid', $pointsAwarded,
                $promoId, $discountAmount, $scheduledFor
            ]);

            // Update user points
            $stmt = $pdo->prepare("UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?");
            $stmt->execute([$pointsAwarded, $user['id']]);

            // Insert Items
            $itemStmt = $pdo->prepare("INSERT INTO order_items (id, order_id, menu_item_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)");
            $priceStmt = $pdo->prepare("SELECT price FROM menu_items WHERE id = ?");
            
            foreach ($items as $item) {
                $priceStmt->execute([$item['menuItemId']]);
                $priceRow = $priceStmt->fetch();
                $itemId = 'oi_' . round(microtime(true) * 1000) . '_' . rand(100, 999);
                $itemStmt->execute([$itemId, $orderId, $item['menuItemId'], $item['quantity'], $priceRow['price']]);
            }

            $pdo->commit();

            // Fetch created order to return
            $orderStmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $orderStmt->execute([$orderId]);
            $order = $orderStmt->fetch();
            $order['total'] = (float)$order['total'];
            $order['subtotal'] = (float)$order['subtotal'];

            $itemsStmt = $pdo->prepare("
                SELECT oi.*, mi.name, mi.description 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                WHERE oi.order_id = ?
            ");
            $itemsStmt->execute([$orderId]);
            
            $items = $itemsStmt->fetchAll();
            foreach($items as &$item) {
                $item['price_at_time'] = (float)$item['price_at_time'];
            }
            $order['items'] = $items;

            http_response_code(201);
            echo json_encode([
                'order' => $order,
                'message' => 'Order placed successfully!'
            ]);

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    private static function getMyOrders() {
        $user = Auth::authenticateToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Access token required']);
            return;
        }

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC");
        $stmt->execute([$user['id']]);
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $order['total'] = (float)$order['total'];
            $order['subtotal'] = (float)$order['subtotal'];
            $itemsStmt = $pdo->prepare("
                SELECT oi.*, mi.name, mi.description 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                WHERE oi.order_id = ?
            ");
            $itemsStmt->execute([$order['id']]);
            $items = $itemsStmt->fetchAll();
            foreach($items as &$item) {
                $item['price_at_time'] = (float)$item['price_at_time'];
            }
            $order['items'] = $items;
        }

        echo json_encode($orders);
    }

    private static function getOrderById($id) {
        $user = Auth::authenticateToken();
        if (!$user) {
            http_response_code(401);
            echo json_encode(['error' => 'Access token required']);
            return;
        }

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? AND customer_id = ?");
        $stmt->execute([$id, $user['id']]);
        $order = $stmt->fetch();

        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'Order not found']);
            return;
        }

        $order['total'] = (float)$order['total'];
        $order['subtotal'] = (float)$order['subtotal'];
        $order['tax'] = (float)$order['tax'];
        $order['delivery_fee'] = (float)$order['delivery_fee'];

        $itemsStmt = $pdo->prepare("
            SELECT oi.*, mi.name, mi.description 
            FROM order_items oi 
            JOIN menu_items mi ON oi.menu_item_id = mi.id 
            WHERE oi.order_id = ?
        ");
        $itemsStmt->execute([$id]);
        $items = $itemsStmt->fetchAll();
        foreach($items as &$item) {
            $item['price_at_time'] = (float)$item['price_at_time'];
        }
        $order['items'] = $items;

        echo json_encode($order);
    }
}
