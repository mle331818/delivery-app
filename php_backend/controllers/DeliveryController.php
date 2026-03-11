<?php
class DeliveryController {
    public static function handle($routeParts) {
        Auth::requireDeliveryRole();

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $routeParts[1] ?? '';

        if ($method === 'GET' && $action === 'ready-orders') {
            self::getReadyOrders();
        } elseif ($method === 'GET' && $action === 'orders') {
            self::getMyOrders();
        } elseif ($method === 'PATCH' && $action === 'orders' && isset($routeParts[3]) && $routeParts[3] === 'status') {
            self::updateStatus($routeParts[2]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Delivery endpoint not found']);
        }
    }

    private static function getReadyOrders() {
        $pdo = DB::getConnection();
        
        $stmt = $pdo->query("
            SELECT o.*, u.first_name as customer_name
            FROM orders o
            LEFT JOIN users u ON o.customer_id = u.id
            WHERE o.status = 'ready' AND (o.driver_id IS NULL OR o.driver_id = '')
            ORDER BY o.created_at ASC
        ");
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

    private static function getMyOrders() {
        $user = Auth::authenticateToken();
        $pdo = DB::getConnection();
        
        $stmt = $pdo->prepare("
            SELECT * FROM orders 
            WHERE driver_id = ? 
            AND status IN ('ready', 'picked_up', 'delivered')
            ORDER BY created_at DESC
        ");
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

    private static function updateStatus($orderId) {
        $user = Auth::authenticateToken();
        $body = getJsonBody();
        $status = $body['status'] ?? '';

        if (!in_array($status, ['picked_up', 'delivered'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            return;
        }

        $pdo = DB::getConnection();

        if ($status === 'picked_up') {
            $stmt = $pdo->prepare("SELECT id, driver_id, status FROM orders WHERE id = ?");
            $stmt->execute([$orderId]);
            $order = $stmt->fetch();

            if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Order not found']);
                return;
            }
            if ($order['status'] !== 'ready') {
                http_response_code(400);
                echo json_encode(['error' => 'Order is not ready for pickup']);
                return;
            }
            if (!empty($order['driver_id']) && $order['driver_id'] !== $user['id']) {
                http_response_code(409);
                echo json_encode(['error' => 'Order already claimed by another driver']);
                return;
            }

            $stmt = $pdo->prepare("UPDATE orders SET status = ?, driver_id = ? WHERE id = ?");
            $stmt->execute(['picked_up', $user['id'], $orderId]);

        } else {
            // delivered
            $stmt = $pdo->prepare("SELECT status, total FROM orders WHERE id = ? AND driver_id = ?");
            $stmt->execute([$orderId, $user['id']]);
            $order = $stmt->fetch();

            if ($order && $order['status'] !== 'delivered') {
                $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ? AND driver_id = ?");
                $stmt->execute([$status, $orderId, $user['id']]);

                if ($stmt->rowCount() > 0) {
                    $txId = uniqid('tx_');
                    $desc = 'Order #' . substr($orderId, -6) . ' delivered';
                    $txStmt = $pdo->prepare("INSERT INTO transactions (id, type, amount, description, order_id) VALUES (?, 'income', ?, ?, ?)");
                    $txStmt->execute([$txId, $order['total'], $desc, $orderId]);
                }
            } else if (!$order) {
                http_response_code(404);
                echo json_encode(['error' => 'Order not found or not assigned to you']);
                return;
            }
        }

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();
        $order['total'] = (float)$order['total'];
        $order['subtotal'] = (float)$order['subtotal'];
        
        echo json_encode([
            'success' => true,
            'message' => 'Status updated',
            'order' => $order
        ]);
    }
}
