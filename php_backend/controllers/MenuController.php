<?php
class MenuController {
    public static function handle($routeParts) {
        $method = $_SERVER['REQUEST_METHOD'];
        $action = $routeParts[1] ?? '';

        if ($method === 'GET' && $action === 'categories') {
            self::getCategories();
        } elseif ($method === 'GET' && $action === 'items') {
            $itemId = $routeParts[2] ?? null;
            if ($itemId) {
                self::getItem($itemId);
            } else {
                self::getItems();
            }
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Menu endpoint not found']);
        }
    }

    private static function getCategories() {
        $pdo = DB::getConnection();
        $stmt = $pdo->query("SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order");
        $categories = $stmt->fetchAll();
        echo json_encode($categories);
    }

    private static function getItems() {
        $categoryId = $_GET['category_id'] ?? null;
        $pdo = DB::getConnection();

        if ($categoryId) {
            $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY display_order");
            $stmt->execute([$categoryId]);
        } else {
            $stmt = $pdo->query("SELECT * FROM menu_items WHERE is_available = 1 ORDER BY display_order");
        }
        
        $items = $stmt->fetchAll();
        foreach ($items as &$item) {
            $item['price'] = (float)$item['price'];
        }
        echo json_encode($items);
    }

    private static function getItem($id) {
        $pdo = DB::getConnection();
        $stmt = $pdo->prepare("SELECT * FROM menu_items WHERE id = ?");
        $stmt->execute([$id]);
        $item = $stmt->fetch();

        if (!$item) {
            http_response_code(404);
            echo json_encode(['error' => 'Item not found']);
            return;
        }

        echo json_encode($item);
    }
}
