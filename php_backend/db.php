<?php
/**
 * PDO SQLite database connection and initialization.
 */
class DB {
    private static $pdo = null;

    public static function getConnection() {
        if (self::$pdo === null) {
            try {
                // Connect to SQLite DB in the same directory
                $dbPath = __DIR__ . '/delivery.db';
                self::$pdo = new PDO("sqlite:" . $dbPath);
                self::$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
                
                // Initialize tables if they don't exist
                self::initDatabase();
                
            } catch (PDOException $e) {
                // In a real app we might log this to a file instead of echoing directly 
                // to avoid breaking JSON payloads, but we'll use a JSON response here.
                header('Content-Type: application/json');
                http_response_code(500);
                echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
                exit;
            }
        }
        return self::$pdo;
    }

    private static function initDatabase() {
        $pdo = self::$pdo;

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                role TEXT NOT NULL,
                first_name TEXT,
                last_name TEXT,
                phone TEXT,
                oauth_provider TEXT,
                oauth_id TEXT,
                loyalty_points INTEGER DEFAULT 0,
                salary REAL DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS categories (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                display_order INTEGER,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS menu_items (
                id TEXT PRIMARY KEY,
                category_id TEXT,
                name TEXT NOT NULL,
                description TEXT,
                price REAL NOT NULL,
                image_url TEXT,
                is_available INTEGER DEFAULT 1,
                display_order INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (category_id) REFERENCES categories(id)
            );

            CREATE TABLE IF NOT EXISTS orders (
                id TEXT PRIMARY KEY,
                customer_id TEXT,
                driver_id TEXT,
                status TEXT DEFAULT 'pending',
                delivery_address TEXT NOT NULL,
                delivery_phone TEXT NOT NULL,
                subtotal REAL NOT NULL,
                delivery_fee REAL DEFAULT 5.00,
                tax REAL NOT NULL,
                total REAL NOT NULL,
                points_awarded INTEGER DEFAULT 0,
                promo_code_id TEXT,
                discount_amount REAL DEFAULT 0,
                scheduled_for DATETIME,
                estimated_delivery_time DATETIME,
                payment_status TEXT DEFAULT 'pending',
                table_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (customer_id) REFERENCES users(id),
                FOREIGN KEY (driver_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS order_items (
                id TEXT PRIMARY KEY,
                order_id TEXT NOT NULL,
                menu_item_id TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                price_at_time REAL NOT NULL,
                special_instructions TEXT,
                FOREIGN KEY (order_id) REFERENCES orders(id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
            );

            CREATE TABLE IF NOT EXISTS favorites (
                user_id TEXT,
                menu_item_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, menu_item_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)
            );

            CREATE TABLE IF NOT EXISTS promo_codes (
                id TEXT PRIMARY KEY,
                code TEXT UNIQUE NOT NULL,
                discount_percent INTEGER NOT NULL,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                id TEXT PRIMARY KEY,
                key TEXT UNIQUE NOT NULL,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                amount REAL NOT NULL,
                description TEXT,
                order_id TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (order_id) REFERENCES orders(id)
            );
        ");

        // Migrate existing tables
        try {
            $pdo->exec("ALTER TABLE users ADD COLUMN salary REAL DEFAULT 0");
        } catch (PDOException $e) {
            // Column already exists
        }

        try {
            $pdo->exec("ALTER TABLE orders ADD COLUMN table_name TEXT");
        } catch (PDOException $e) {
            // Column already exists
        }

        // Seed initial data if categories are empty
        $stmt = $pdo->query("SELECT COUNT(*) as count FROM categories");
        $row = $stmt->fetch();
        if ($row['count'] == 0) {
            self::seedData();
        }
    }

    private static function seedData() {
        $pdo = self::$pdo;
        
        // Add default setting
        $pdo->exec("INSERT OR IGNORE INTO settings (id, key, value) VALUES ('s1', 'loyalty_rate', '1')");

        // Insert categories
        $categories = [
            ['id' => 'cat1', 'name' => 'Nigiri', 'description' => 'Hand-pressed sushi', 'order' => 1],
            ['id' => 'cat2', 'name' => 'Sashimi', 'description' => 'Fresh raw fish', 'order' => 2],
            ['id' => 'cat3', 'name' => 'Rolls', 'description' => 'Maki and specialty rolls', 'order' => 3],
            ['id' => 'cat4', 'name' => 'Appetizers', 'description' => 'Starters and sides', 'order' => 4]
        ];

        $stmt = $pdo->prepare('INSERT INTO categories (id, name, description, display_order) VALUES (?, ?, ?, ?)');
        foreach ($categories as $cat) {
            $stmt->execute([$cat['id'], $cat['name'], $cat['description'], $cat['order']]);
        }

        // Insert menu items
        $menuItems = [
            ['id' => 'item1', 'cat' => 'cat1', 'name' => 'Salmon Nigiri', 'desc' => 'Fresh salmon on rice', 'price' => 6.50],
            ['id' => 'item2', 'cat' => 'cat1', 'name' => 'Tuna Nigiri', 'desc' => 'Premium tuna on rice', 'price' => 7.00],
            ['id' => 'item3', 'cat' => 'cat1', 'name' => 'Eel Nigiri', 'desc' => 'Grilled eel with sauce', 'price' => 8.00],
            ['id' => 'item4', 'cat' => 'cat2', 'name' => 'Salmon Sashimi', 'desc' => '5 pieces of fresh salmon', 'price' => 12.00],
            ['id' => 'item5', 'cat' => 'cat2', 'name' => 'Tuna Sashimi', 'desc' => '5 pieces of premium tuna', 'price' => 14.00],
            ['id' => 'item6', 'cat' => 'cat3', 'name' => 'California Roll', 'desc' => 'Crab, avocado, cucumber', 'price' => 8.50],
            ['id' => 'item7', 'cat' => 'cat3', 'name' => 'Spicy Tuna Roll', 'desc' => 'Tuna, spicy mayo, cucumber', 'price' => 9.00],
            ['id' => 'item8', 'cat' => 'cat3', 'name' => 'Dragon Roll', 'desc' => 'Eel, cucumber, avocado, eel sauce', 'price' => 13.00],
            ['id' => 'item9', 'cat' => 'cat4', 'name' => 'Miso Soup', 'desc' => 'Traditional Japanese soup', 'price' => 4.00],
            ['id' => 'item10', 'cat' => 'cat4', 'name' => 'Edamame', 'desc' => 'Steamed soybeans with salt', 'price' => 5.50],
            ['id' => 'item11', 'cat' => 'cat4', 'name' => 'Gyoza', 'desc' => 'Pan-fried dumplings (6 pieces)', 'price' => 7.50],
            ['id' => 'item12', 'cat' => 'cat3', 'name' => 'Rainbow Roll', 'desc' => 'Assorted fish, avocado, cucumber', 'price' => 14.00]
        ];

        $stmt = $pdo->prepare('INSERT INTO menu_items (id, category_id, name, description, price, display_order) VALUES (?, ?, ?, ?, ?, ?)');
        foreach ($menuItems as $idx => $item) {
            $stmt->execute([$item['id'], $item['cat'], $item['name'], $item['desc'], $item['price'], $idx + 1]);
        }

        // Create test accounts
        $stmt = $pdo->prepare('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)');
        
        $customerHash = password_hash('password123', PASSWORD_BCRYPT);
        $stmt->execute(['user1', 'customer@test.com', $customerHash, 'customer', 'John', 'Doe']);

        $kitchenHash = password_hash('kitchen123', PASSWORD_BCRYPT);
        $stmt->execute(['kitchen1', 'kitchen@sushi.com', $kitchenHash, 'kitchen', 'Kitchen', 'Staff']);

        $adminHash = password_hash('admin123', PASSWORD_BCRYPT);
        $stmt->execute(['admin1', 'admin@sushi.com', $adminHash, 'admin', 'Admin', 'User']);

        $deliveryHash = password_hash('delivery123', PASSWORD_BCRYPT);
        $stmt->execute(['delivery1', 'driver@sushi.com', $deliveryHash, 'delivery', 'Fast', 'Driver']);
    }
}
