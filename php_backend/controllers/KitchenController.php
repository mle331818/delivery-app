<?php
class KitchenController {
    public static function handle($routeParts) {
        Auth::requireKitchenRole();

        $method = $_SERVER['REQUEST_METHOD'];
        $action = $routeParts[1] ?? '';

        if ($method === 'GET' && $action === 'orders') {
            self::getOrders();
        } elseif ($method === 'PATCH' && $action === 'orders' && isset($routeParts[3]) && $routeParts[3] === 'status') {
            self::updateStatus($routeParts[2]);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Kitchen endpoint not found']);
        }
    }

    private static function getOrders() {
        $status = $_GET['status'] ?? 'pending';
        $pdo = DB::getConnection();
        
        $stmt = $pdo->prepare("SELECT o.*, d.first_name as driver_name FROM orders o LEFT JOIN users d ON o.driver_id = d.id WHERE o.status = ? ORDER BY o.created_at ASC");
        $stmt->execute([$status]);
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
        $body = getJsonBody();
        $status = $body['status'] ?? '';
        $estimatedTime = $body['estimatedTime'] ?? null;

        if (!in_array($status, ['preparing', 'ready'])) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid status']);
            return;
        }

        $pdo = DB::getConnection();

        if ($status === 'preparing' && $estimatedTime) {
            // ISO 8601 timestamp
            $estimatedDeliveryTime = date('Y-m-d\TH:i:s\Z', time() + ($estimatedTime * 60));
            $stmt = $pdo->prepare("UPDATE orders SET status = ?, estimated_delivery_time = ? WHERE id = ?");
            $stmt->execute([$status, $estimatedDeliveryTime, $orderId]);
        } else {
            $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?");
            $stmt->execute([$status, $orderId]);
        }

        $stmt = $pdo->prepare("SELECT * FROM orders WHERE id = ?");
        $stmt->execute([$orderId]);
        echo json_encode($stmt->fetch());
    }
}

