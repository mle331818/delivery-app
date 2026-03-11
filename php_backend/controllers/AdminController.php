<?php
class AdminController {
    public static function handle($routeParts) {
        // All /api/admin/* endpoints require the admin role
        Auth::requireAdminRole();

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $routeParts[1] ?? '';

        if ($action === 'staff') {
            if ($method === 'POST') self::createStaff();
            elseif ($method === 'GET') self::getStaff();
            elseif ($method === 'PUT' && isset($routeParts[2])) self::updateStaff($routeParts[2]);
            elseif ($method === 'DELETE' && isset($routeParts[2])) self::deleteStaff($routeParts[2]);
        } elseif ($action === 'promos') {
            if ($method === 'POST') self::createPromo();
            elseif ($method === 'GET') self::getPromos();
        } elseif ($action === 'orders') {
            if ($method === 'GET') self::getOrders();
            elseif ($method === 'PATCH' && isset($routeParts[3]) && $routeParts[3] === 'assign') {
                self::assignOrder($routeParts[2]); // /api/admin/orders/:id/assign
            }
        } elseif ($action === 'drivers') {
            if ($method === 'GET') self::getDrivers();
            elseif ($method === 'POST') self::createDriver();
        } elseif ($action === 'customers') {
            if ($method === 'GET') self::getCustomers();
        } elseif ($action === 'users' && isset($routeParts[3]) && $routeParts[3] === 'loyalty') {
            if ($method === 'PATCH') self::updateLoyalty($routeParts[2]); // /api/admin/users/:id/loyalty
        } elseif ($action === 'menu') {
            if ($method === 'POST') self::createMenuItem();
            elseif ($method === 'DELETE' && isset($routeParts[2])) self::deleteMenuItem($routeParts[2]);
        } elseif ($action === 'settings') {
            if ($method === 'GET') self::getSettings();
            elseif ($method === 'POST') self::saveSettings();
        } elseif ($action === 'transactions') {
            if ($method === 'GET') self::getTransactions();
            elseif ($method === 'POST') self::createTransaction();
        } elseif ($action === 'pos-order') {
            if ($method === 'POST') self::createPosOrder();
            elseif ($method === 'PATCH' && isset($routeParts[2])) self::payPosOrder($routeParts[2]);
        } elseif ($action === 'open-tables') {
            if ($method === 'GET') self::getOpenTables();
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Admin endpoint not found']);
        }
    }

    private static function getStaff() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query('SELECT id, first_name, last_name, email, phone, role, salary FROM users WHERE role IN ("delivery", "kitchen")');
        echo json_encode($stmt->fetchAll());
    }

    private static function createStaff() {
        $body = getJsonBody();
        $role = $body['role'] ?? null;
        if (!in_array($role, ['delivery', 'kitchen'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid role']);
            return;
        }

        $pdo = DB::getConnection();
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$body['email']]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already exists']);
            return;
        }

        $userId = $role . '_' . round(microtime(true) * 1000);
        $hash = password_hash($body['password'], PASSWORD_BCRYPT);
        $salary = (float)($body['salary'] ?? 0);

        $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $body['email'], $hash, $role, $body['firstName'], $body['lastName'], $body['phone'] ?? null, $salary]);

        if ($salary > 0) {
            $txId = uniqid('tx_');
            $desc = 'Initial salary payment for ' . $body['firstName'] . ' ' . $body['lastName'];
            $txStmt = $pdo->prepare("INSERT INTO transactions (id, type, amount, description) VALUES (?, 'salary', ?, ?)");
            $txStmt->execute([$txId, $salary, $desc]);
        }

        http_response_code(201);
        echo json_encode(['id' => $userId, 'firstName' => $body['firstName'], 'lastName' => $body['lastName'], 'email' => $body['email'], 'role' => $role, 'salary' => $salary]);
    }

    private static function verifyAdminPassword($password) {
        if (empty($password)) return false;
        $user = Auth::authenticateToken();
        $pdo = DB::getConnection();
        $stmt = $pdo->prepare('SELECT password_hash FROM users WHERE id = ?');
        $stmt->execute([$user['id']]);
        $hash = $stmt->fetchColumn();
        return password_verify($password, $hash);
    }

    private static function updateStaff($staffId) {
        $body = getJsonBody();
        if (!self::verifyAdminPassword($body['adminPassword'] ?? '')) {
            http_response_code(403);
            echo json_encode(['error' => 'Invalid admin password']);
            return;
        }

        $pdo = DB::getConnection();
        $firstName = $body['firstName'];
        $lastName = $body['lastName'];
        $email = $body['email'];
        $phone = $body['phone'] ?? null;
        $role = $body['role'];
        $salary = (float)($body['salary'] ?? 0);
        
        $params = [$firstName, $lastName, $email, $phone, $role, $salary];
        
        $query = 'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, salary = ?';
        
        if (!empty($body['password'])) {
            $query .= ', password_hash = ?';
            $params[] = password_hash($body['password'], PASSWORD_BCRYPT);
        }
        
        $query .= ' WHERE id = ?';
        $params[] = $staffId;
        
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        
        echo json_encode(['success' => true]);
    }

    private static function deleteStaff($staffId) {
        $body = getJsonBody();
        if (!self::verifyAdminPassword($body['adminPassword'] ?? '')) {
            http_response_code(403);
            echo json_encode(['error' => 'Invalid admin password']);
            return;
        }

        $pdo = DB::getConnection();
        
        $admin = Auth::authenticateToken();
        if ($admin['id'] === $staffId) {
            http_response_code(400);
            echo json_encode(['error' => 'Cannot delete your own admin account']);
            return;
        }

        try {
            $stmt = $pdo->prepare('DELETE FROM users WHERE id = ?');
            $stmt->execute([$staffId]);
            echo json_encode(['success' => true]);
        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode(['error' => 'Failed to delete staff. They may have related orders or records.']);
        }
    }

    private static function getPromos() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query('SELECT * FROM promo_codes ORDER BY created_at DESC');
        echo json_encode($stmt->fetchAll());
    }

    private static function createPromo() {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        $id = 'promo_' . round(microtime(true) * 1000);
        $stmt = $pdo->prepare('INSERT INTO promo_codes (id, code, discount_percent) VALUES (?, ?, ?)');
        $stmt->execute([$id, strtoupper($body['code']), $body['discountPercent']]);
        
        http_response_code(201);
        echo json_encode(['success' => true]);
    }

    private static function getOrders() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query('
            SELECT o.*, u.first_name as driver_name 
            FROM orders o 
            LEFT JOIN users u ON o.driver_id = u.id 
            ORDER BY o.created_at DESC
        ');
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $itemsStmt = $pdo->prepare("
                SELECT oi.*, mi.name, mi.description 
                FROM order_items oi 
                JOIN menu_items mi ON oi.menu_item_id = mi.id 
                WHERE oi.order_id = ?
            ");
            $itemsStmt->execute([$order['id']]);
            $order['items'] = $itemsStmt->fetchAll();
        }

        echo json_encode($orders);
    }

    private static function assignOrder($orderId) {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        $stmt = $pdo->prepare('UPDATE orders SET driver_id = ? WHERE id = ?');
        $stmt->execute([$body['driverId'], $orderId]);
        echo json_encode(['success' => true, 'message' => 'Driver assigned']);
    }

    private static function getDrivers() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query('SELECT id, first_name, last_name, email, phone FROM users WHERE role = "delivery"');
        echo json_encode($stmt->fetchAll());
    }

    private static function createDriver() {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        
        $stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
        $stmt->execute([$body['email']]);
        if ($stmt->fetch()) {
            http_response_code(400);
            echo json_encode(['error' => 'Email already exists']);
            return;
        }

        $userId = 'driver_' . round(microtime(true) * 1000);
        $hash = password_hash($body['password'], PASSWORD_BCRYPT);
        
        $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([$userId, $body['email'], $hash, 'delivery', $body['firstName'], $body['lastName'], $body['phone'] ?? null]);

        http_response_code(201);
        echo json_encode(['id' => $userId, 'firstName' => $body['firstName'], 'lastName' => $body['lastName'], 'email' => $body['email'], 'role' => 'delivery']);
    }

    private static function getCustomers() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query('SELECT id, first_name, last_name, email, phone, loyalty_points FROM users WHERE role = "customer"');
        echo json_encode($stmt->fetchAll());
    }

    private static function updateLoyalty($userId) {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        $stmt = $pdo->prepare('UPDATE users SET loyalty_points = ? WHERE id = ?');
        $stmt->execute([$body['points'], $userId]);
        echo json_encode(['success' => true]);
    }

    private static function createMenuItem() {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        
        $stmt = $pdo->prepare('SELECT MAX(display_order) as max FROM menu_items WHERE category_id = ?');
        $stmt->execute([$body['categoryId']]);
        $row = $stmt->fetch();
        $displayOrder = ($row['max'] ?? 0) + 1;

        $itemId = 'item_' . round(microtime(true) * 1000);
        
        $stmt = $pdo->prepare('
            INSERT INTO menu_items (id, category_id, name, description, price, image_url, display_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ');
        $stmt->execute([
            $itemId, $body['categoryId'], $body['name'], $body['description'], 
            $body['price'], $body['imageUrl'] ?? null, $displayOrder
        ]);

        $stmt = $pdo->prepare('SELECT * FROM menu_items WHERE id = ?');
        $stmt->execute([$itemId]);
        
        http_response_code(201);
        echo json_encode($stmt->fetch());
    }

    private static function deleteMenuItem($itemId) {
        $pdo = DB::getConnection();
        $stmt = $pdo->prepare('DELETE FROM menu_items WHERE id = ?');
        $stmt->execute([$itemId]);
        echo json_encode(['success' => true]);
    }

    private static function getSettings() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query("SELECT value FROM settings WHERE key = 'loyalty_rate'");
        $rate = $stmt->fetch();
        echo json_encode(['loyaltyRate' => $rate ? $rate['value'] : 1]);
    }

    private static function saveSettings() {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        
        $stmt = $pdo->prepare("
            INSERT INTO settings (id, key, value) VALUES ('s1', 'loyalty_rate', ?)
            ON CONFLICT(key) DO UPDATE SET value = ?
        ");
        $stmt->execute([$body['loyaltyRate'], $body['loyaltyRate']]);
        echo json_encode(['success' => true]);
    }

    private static function getTransactions() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query("SELECT * FROM transactions ORDER BY created_at DESC");
        // Cast amount to float
        $transactions = $stmt->fetchAll();
        foreach($transactions as &$t) {
            $t['amount'] = (float)$t['amount'];
        }
        echo json_encode($transactions);
    }

    private static function createTransaction() {
        $body = getJsonBody();
        $pdo = DB::getConnection();
        
        $type = $body['type'] ?? 'expense';
        $amount = (float)($body['amount'] ?? 0);
        $description = $body['description'] ?? '';
        
        if (!in_array($type, ['income', 'expense', 'salary'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid transaction type']);
            return;
        }

        $id = uniqid('tx_');
        $stmt = $pdo->prepare("INSERT INTO transactions (id, type, amount, description) VALUES (?, ?, ?, ?)");
        $stmt->execute([$id, $type, $amount, $description]);
        
        http_response_code(201);
        echo json_encode([
            'id' => $id,
            'type' => $type,
            'amount' => $amount,
            'description' => $description,
            'created_at' => date('Y-m-d H:i:s')
        ]);
    }

    private static function createPosOrder() {
        $body = getJsonBody();
        $items = $body['items'] ?? [];
        $tableName = $body['tableName'] ?? 'Table 1';

        if (empty($items)) {
            http_response_code(400);
            echo json_encode(['error' => 'No items in order']);
            return;
        }

        $pdo = DB::getConnection();

        // Calculate totals
        $subtotal = 0;
        $priceCache = [];
        foreach ($items as $item) {
            $stmt = $pdo->prepare("SELECT id, name, price FROM menu_items WHERE id = ?");
            $stmt->execute([$item['menuItemId']]);
            $menuItem = $stmt->fetch();
            if (!$menuItem) {
                http_response_code(400);
                echo json_encode(['error' => "Item not found: {$item['menuItemId']}"]);
                return;
            }
            $priceCache[$item['menuItemId']] = $menuItem;
            $subtotal += $menuItem['price'] * $item['quantity'];
        }

        $tax = $subtotal * 0.08;
        $total = $subtotal + $tax; // No delivery fee for POS

        $pdo->beginTransaction();
        try {
            $orderId = 'pos_' . round(microtime(true) * 1000);

            $stmt = $pdo->prepare("
                INSERT INTO orders (
                    id, customer_id, delivery_address, delivery_phone, subtotal,
                    delivery_fee, tax, total, payment_status, status, table_name
                ) VALUES (?, NULL, ?, 'POS Order', ?, 0, ?, ?, 'pending', 'pending', ?)
            ");
            $stmt->execute([
                $orderId,
                $tableName . ' - Dine In',
                $subtotal,
                $tax,
                $total,
                $tableName
            ]);

            $itemStmt = $pdo->prepare("INSERT INTO order_items (id, order_id, menu_item_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)");
            foreach ($items as $item) {
                $itemId = 'oi_' . round(microtime(true) * 1000) . '_' . rand(100, 999);
                $price = $priceCache[$item['menuItemId']]['price'];
                $itemStmt->execute([$itemId, $orderId, $item['menuItemId'], $item['quantity'], $price]);
            }
            // Income is NOT logged here — it is logged when the bill is paid

            $pdo->commit();

            // Fetch full order for invoice
            $orderStmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
            $orderStmt->execute([$orderId]);
            $order = $orderStmt->fetch();
            $order['total'] = (float)$order['total'];
            $order['subtotal'] = (float)$order['subtotal'];
            $order['tax'] = (float)$order['tax'];
            $order['delivery_fee'] = (float)$order['delivery_fee'];

            $itemsStmt = $pdo->prepare("
                SELECT oi.*, mi.name FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = ?
            ");
            $itemsStmt->execute([$orderId]);
            $orderItems = $itemsStmt->fetchAll();
            foreach ($orderItems as &$oi) {
                $oi['price_at_time'] = (float)$oi['price_at_time'];
            }
            $order['items'] = $orderItems;

            http_response_code(201);
            echo json_encode(['success' => true, 'order' => $order]);

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }

    private static function getOpenTables() {
        $pdo = DB::getConnection();
        $period = $_GET['period'] ?? 'day';

        // Build date filter
        switch ($period) {
            case 'week':
                $dateFilter = "AND date(o.created_at) >= date('now', '-7 days')";
                break;
            case 'month':
                $dateFilter = "AND strftime('%Y-%m', o.created_at) = strftime('%Y-%m', 'now')";
                break;
            case 'all':
                $dateFilter = "";
                break;
            default: // 'day'
                $dateFilter = "AND date(o.created_at) = date('now')";
                break;
        }

        $stmt = $pdo->prepare("
            SELECT o.*, d.first_name as driver_name
            FROM orders o
            LEFT JOIN users d ON o.driver_id = d.id
            WHERE o.id LIKE 'pos_%' $dateFilter
            ORDER BY o.created_at DESC
        ");
        $stmt->execute();
        $orders = $stmt->fetchAll();

        foreach ($orders as &$order) {
            $order['total'] = (float)$order['total'];
            $order['subtotal'] = (float)$order['subtotal'];
            $order['tax'] = (float)$order['tax'];
            $order['delivery_fee'] = (float)$order['delivery_fee'];
            $itemsStmt = $pdo->prepare("
                SELECT oi.*, mi.name FROM order_items oi
                JOIN menu_items mi ON oi.menu_item_id = mi.id
                WHERE oi.order_id = ?
            ");
            $itemsStmt->execute([$order['id']]);
            $items = $itemsStmt->fetchAll();
            foreach ($items as &$item) {
                $item['price_at_time'] = (float)$item['price_at_time'];
            }
            $order['items'] = $items;
        }

        echo json_encode($orders);
    }

    private static function payPosOrder($orderId) {
        $pdo = DB::getConnection();

        // Fetch the order
        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ? AND id LIKE 'pos_%'");
        $stmt->execute([$orderId]);
        $order = $stmt->fetch();

        if (!$order) {
            http_response_code(404);
            echo json_encode(['error' => 'POS order not found']);
            return;
        }

        if ($order['payment_status'] === 'paid') {
            http_response_code(400);
            echo json_encode(['error' => 'Order is already paid']);
            return;
        }

        $pdo->beginTransaction();
        try {
            // Mark order as paid and delivered
            $stmt = $pdo->prepare("UPDATE orders SET payment_status = 'paid', status = 'delivered' WHERE id = ?");
            $stmt->execute([$orderId]);

            // Log income to finances
            $txId = uniqid('tx_');
            $tableName = $order['table_name'] ?? 'POS';
            $total = (float)$order['total'];
            $txStmt = $pdo->prepare("INSERT INTO transactions (id, type, amount, description, order_id) VALUES (?, 'income', ?, ?, ?)");
            $txStmt->execute([$txId, $total, "POS Payment - $tableName", $orderId]);

            $pdo->commit();

            echo json_encode(['success' => true, 'message' => 'Order marked as paid', 'transactionId' => $txId]);

        } catch (Exception $e) {
            $pdo->rollBack();
            http_response_code(500);
            echo json_encode(['error' => $e->getMessage()]);
        }
    }
}
