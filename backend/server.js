import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Initialize database with promises
const db = new sqlite3.Database(join(__dirname, 'delivery.db'));

// Promisify database methods
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));
const dbAll = promisify(db.all.bind(db));
const dbExec = promisify(db.exec.bind(db));

// Helper function to run SQL
const run = (sql, params = []) => dbRun(sql, params);
const get = (sql, params = []) => dbGet(sql, params);
const all = (sql, params = []) => dbAll(sql, params);
const exec = (sql) => dbExec(sql);

// Initialize database
async function initDatabase() {
  try {
    // Create tables
    await exec(`
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
        payment_status TEXT DEFAULT 'pending',
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

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL, -- income, expense, salary
        amount REAL NOT NULL,
        description TEXT,
        order_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check for new columns in users table
    try {
      await run('ALTER TABLE users ADD COLUMN loyalty_points INTEGER DEFAULT 0');
    } catch (e) { /* ignore if exists */ }
    try {
      await run('ALTER TABLE users ADD COLUMN salary REAL DEFAULT 0');
    } catch (e) { /* ignore */ }

    // Check for new columns in orders table
    try {
      await run('ALTER TABLE orders ADD COLUMN table_name TEXT');
    } catch (e) { /* ignore */ }
    try {
      await run('ALTER TABLE orders ADD COLUMN points_awarded INTEGER DEFAULT 0');
    } catch (e) { /* ignore */ }
    try {
      await run('ALTER TABLE orders ADD COLUMN promo_code_id TEXT');
    } catch (e) { /* ignore */ }
    try {
      await run('ALTER TABLE orders ADD COLUMN discount_amount REAL DEFAULT 0');
    } catch (e) { /* ignore */ }
    try {
      await run('ALTER TABLE orders ADD COLUMN scheduled_for DATETIME');
    } catch (e) { /* ignore */ }
    try {
      await run('ALTER TABLE orders ADD COLUMN estimated_delivery_time DATETIME');
    } catch (e) { /* ignore */ }

    // Create Settings Table
    await run(`
      CREATE TABLE IF NOT EXISTS settings (
        id TEXT PRIMARY KEY,
        key TEXT UNIQUE NOT NULL,
        value TEXT NOT NULL
      );
    `);
    try {
      await run("INSERT OR IGNORE INTO settings (id, key, value) VALUES ('s1', 'loyalty_rate', '1')");
    } catch (e) { }
    // ...

    // Seed initial data


    // Seed initial data
    const checkData = await get('SELECT COUNT(*) as count FROM categories');
    if (checkData.count === 0) {
      // Insert categories
      const categories = [
        { id: 'cat1', name: 'Nigiri', description: 'Hand-pressed sushi', order: 1 },
        { id: 'cat2', name: 'Sashimi', description: 'Fresh raw fish', order: 2 },
        { id: 'cat3', name: 'Rolls', description: 'Maki and specialty rolls', order: 3 },
        { id: 'cat4', name: 'Appetizers', description: 'Starters and sides', order: 4 }
      ];

      for (const cat of categories) {
        await run('INSERT INTO categories (id, name, description, display_order) VALUES (?, ?, ?, ?)',
          [cat.id, cat.name, cat.description, cat.order]);
      }

      // Insert menu items
      const menuItems = [
        { id: 'item1', cat: 'cat1', name: 'Salmon Nigiri', desc: 'Fresh salmon on rice', price: 6.50 },
        { id: 'item2', cat: 'cat1', name: 'Tuna Nigiri', desc: 'Premium tuna on rice', price: 7.00 },
        { id: 'item3', cat: 'cat1', name: 'Eel Nigiri', desc: 'Grilled eel with sauce', price: 8.00 },
        { id: 'item4', cat: 'cat2', name: 'Salmon Sashimi', desc: '5 pieces of fresh salmon', price: 12.00 },
        { id: 'item5', cat: 'cat2', name: 'Tuna Sashimi', desc: '5 pieces of premium tuna', price: 14.00 },
        { id: 'item6', cat: 'cat3', name: 'California Roll', desc: 'Crab, avocado, cucumber', price: 8.50 },
        { id: 'item7', cat: 'cat3', name: 'Spicy Tuna Roll', desc: 'Tuna, spicy mayo, cucumber', price: 9.00 },
        { id: 'item8', cat: 'cat3', name: 'Dragon Roll', desc: 'Eel, cucumber, avocado, eel sauce', price: 13.00 },
        { id: 'item9', cat: 'cat4', name: 'Miso Soup', desc: 'Traditional Japanese soup', price: 4.00 },
        { id: 'item10', cat: 'cat4', name: 'Edamame', desc: 'Steamed soybeans with salt', price: 5.50 },
        { id: 'item11', cat: 'cat4', name: 'Gyoza', desc: 'Pan-fried dumplings (6 pieces)', price: 7.50 },
        { id: 'item12', cat: 'cat3', name: 'Rainbow Roll', desc: 'Assorted fish, avocado, cucumber', price: 14.00 }
      ];

      for (let idx = 0; idx < menuItems.length; idx++) {
        const item = menuItems[idx];
        await run('INSERT INTO menu_items (id, category_id, name, description, price, display_order) VALUES (?, ?, ?, ?, ?, ?)',
          [item.id, item.cat, item.name, item.desc, item.price, idx + 1]);
      }

      // Create test accounts
      const hashedPassword = bcrypt.hashSync('password123', 10);
      await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
        ['user1', 'customer@test.com', hashedPassword, 'customer', 'John', 'Doe']);

      // Create kitchen staff account
      const kitchenPassword = bcrypt.hashSync('kitchen123', 10);
      await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
        ['kitchen1', 'kitchen@sushi.com', kitchenPassword, 'kitchen', 'Kitchen', 'Staff']);

      // Create admin account
      const adminPassword = bcrypt.hashSync('admin123', 10);
      await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
        ['admin1', 'admin@sushi.com', adminPassword, 'admin', 'Admin', 'User']);

      // Create delivery driver account
      const deliveryPassword = bcrypt.hashSync('delivery123', 10);
      await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name) VALUES (?, ?, ?, ?, ?, ?)',
        ['delivery1', 'driver@sushi.com', deliveryPassword, 'delivery', 'Fast', 'Driver']);
    }
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Initialize database on startup
initDatabase();

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Middleware to verify kitchen/admin role
const requireKitchenRole = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'kitchen' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Kitchen access required. Please login with kitchen credentials.' });
  }

  next();
};

const requireAdminRole = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireDeliveryRole = (req, res, next) => {
  if (!req.user || req.user.role !== 'delivery') {
    return res.status(403).json({ error: 'Delivery access required' });
  }
  next();
};

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const passwordHash = bcrypt.hashSync(password, 10);
    const userId = 'user_' + Date.now();

    await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email, passwordHash, 'customer', firstName || null, lastName || null, phone || null]);

    const token = jwt.sign({ id: userId, email, role: 'customer' }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ token, user: { id: userId, email, role: 'customer', firstName, lastName } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const user = await get('SELECT * FROM users WHERE email = ?', [email]);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    const user = await get('SELECT id, email, role, first_name, last_name, phone, loyalty_points FROM users WHERE id = ?', [req.user.id]);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Google OAuth endpoint
app.post('/api/auth/google', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Google token required' });
    }

    // Verify Google JWT token
    // For demo: decode token (in production, verify with Google's public keys)
    let decoded;

    try {
      // Decode Google JWT token
      // Note: In production, you should verify the token signature with Google's public keys
      // For now, we decode it to get user info
      decoded = jwt.decode(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid Google token' });
      }
    } catch (err) {
      console.error('Google token decode error:', err);
      return res.status(401).json({ error: 'Invalid Google token' });
    }

    if (!decoded || !decoded.email) {
      return res.status(401).json({ error: 'Invalid Google token data' });
    }

    const { email, given_name: firstName, family_name: lastName, sub: googleId } = decoded;

    // Check if user exists
    let user = await get('SELECT * FROM users WHERE email = ? OR (oauth_provider = ? AND oauth_id = ?)',
      [email, 'google', googleId]);

    if (user) {
      // Update OAuth info if needed
      if (!user.oauth_provider) {
        await run('UPDATE users SET oauth_provider = ?, oauth_id = ? WHERE id = ?',
          ['google', googleId, user.id]);
      }
    } else {
      // Create new user
      const userId = 'user_' + Date.now();
      await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, email, null, 'customer', firstName || null, lastName || null, 'google', googleId]);

      user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    }

    const authToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Facebook OAuth endpoint
app.post('/api/auth/facebook', async (req, res) => {
  try {
    const { accessToken, userID, email, name } = req.body;

    if (!accessToken || !userID) {
      return res.status(400).json({ error: 'Facebook token and user ID required' });
    }

    // Verify Facebook token (in production, verify with Facebook API)
    // For demo, we'll trust the client-provided data
    // In production: fetch(`https://graph.facebook.com/me?access_token=${accessToken}`)

    const nameParts = name ? name.split(' ') : [];
    const firstName = nameParts[0] || null;
    const lastName = nameParts.slice(1).join(' ') || null;

    // Check if user exists
    let user = await get('SELECT * FROM users WHERE email = ? OR (oauth_provider = ? AND oauth_id = ?)',
      [email || `fb_${userID}@facebook.com`, 'facebook', userID]);

    if (user) {
      // Update OAuth info if needed
      if (!user.oauth_provider) {
        await run('UPDATE users SET oauth_provider = ?, oauth_id = ?, email = ? WHERE id = ?',
          ['facebook', userID, email || user.email, user.id]);
      }
    } else {
      // Create new user
      const userId = 'user_' + Date.now();
      const userEmail = email || `fb_${userID}@facebook.com`;
      await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name, oauth_provider, oauth_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, userEmail, null, 'customer', firstName, lastName, 'facebook', userID]);

      user = await get('SELECT * FROM users WHERE id = ?', [userId]);
    }

    const authToken = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '24h' });

    res.json({
      token: authToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (error) {
    console.error('Facebook OAuth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Menu endpoints
app.get('/api/menu/categories', async (req, res) => {
  try {
    const categories = await all('SELECT * FROM categories WHERE is_active = 1 ORDER BY display_order');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/menu/items', async (req, res) => {
  try {
    const categoryId = req.query.category_id;
    let items;

    if (categoryId) {
      items = await all('SELECT * FROM menu_items WHERE category_id = ? AND is_available = 1 ORDER BY display_order', [categoryId]);
    } else {
      items = await all('SELECT * FROM menu_items WHERE is_available = 1 ORDER BY display_order');
    }

    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/menu/items/:id', async (req, res) => {
  try {
    const item = await get('SELECT * FROM menu_items WHERE id = ?', [req.params.id]);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Order endpoints
// Favorites Endpoints
app.get('/api/favorites', authenticateToken, async (req, res) => {
  try {
    const favorites = await all(`
      SELECT mi.* FROM favorites f
      JOIN menu_items mi ON f.menu_item_id = mi.id
      WHERE f.user_id = ?
    `, [req.user.id]);
    res.json(favorites);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/favorites/:itemId', authenticateToken, async (req, res) => {
  try {
    await run('INSERT OR IGNORE INTO favorites (user_id, menu_item_id) VALUES (?, ?)',
      [req.user.id, req.params.itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/favorites/:itemId', authenticateToken, async (req, res) => {
  try {
    await run('DELETE FROM favorites WHERE user_id = ? AND menu_item_id = ?',
      [req.user.id, req.params.itemId]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Promo Endpoints
app.post('/api/promos/validate', authenticateToken, async (req, res) => {
  try {
    const { code } = req.body;
    const promo = await get('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1', [code.toUpperCase()]);

    if (!promo) return res.status(404).json({ error: 'Invalid promo code' });

    res.json(promo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Updated Order Creation for Promos, Scheduling & Loyalty
app.post('/api/orders', authenticateToken, async (req, res) => {
  try {
    const { items, deliveryAddress, deliveryPhone, promoCode, scheduledFor } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }
    if (!deliveryAddress || !deliveryPhone) {
      return res.status(400).json({ error: 'Delivery address and phone required' });
    }

    // Calculate totals
    let subtotal = 0;
    for (const item of items) {
      const menuItem = await get('SELECT price FROM menu_items WHERE id = ?', [item.menuItemId]);
      if (!menuItem) {
        return res.status(400).json({ error: `Item ${item.menuItemId} not found` });
      }
      subtotal += menuItem.price * item.quantity;
    }

    // Apply Promo
    let discountAmount = 0;
    let promoId = null;
    if (promoCode) {
      const promo = await get('SELECT * FROM promo_codes WHERE code = ? AND is_active = 1', [promoCode]);
      if (promo) {
        discountAmount = subtotal * (promo.discount_percent / 100);
        promoId = promo.id;
      }
    }

    const deliveryFee = 5.00;
    const tax = (subtotal - discountAmount) * 0.08; // 8% tax on discounted amount
    const total = (subtotal - discountAmount) + deliveryFee + tax;

    // Calculate Loyalty Points (Fetch rate from settings)
    let loyaltyRate = 1;
    try {
      const setting = await get("SELECT value FROM settings WHERE key = 'loyalty_rate'");
      if (setting) loyaltyRate = parseFloat(setting.value);
    } catch (e) { }

    const pointsAwarded = Math.floor(subtotal * loyaltyRate);

    // Create order
    const orderId = 'order_' + Date.now();
    await run(`
      INSERT INTO orders (
        id, customer_id, delivery_address, delivery_phone, subtotal, 
        delivery_fee, tax, total, payment_status, points_awarded, 
        promo_code_id, discount_amount, scheduled_for
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderId, req.user.id, deliveryAddress, deliveryPhone, subtotal,
      deliveryFee, tax, total, 'paid', pointsAwarded,
      promoId, discountAmount, scheduledFor || null
    ]);

    // Update User Loyalty Points
    await run('UPDATE users SET loyalty_points = COALESCE(loyalty_points, 0) + ? WHERE id = ?',
      [pointsAwarded, req.user.id]);

    // Insert order items
    for (const item of items) {
      const menuItem = await get('SELECT price FROM menu_items WHERE id = ?', [item.menuItemId]);
      const itemId = 'oi_' + Date.now() + '_' + Math.random();
      await run(`
        INSERT INTO order_items (id, order_id, menu_item_id, quantity, price_at_time)
        VALUES (?, ?, ?, ?, ?)
      `, [itemId, orderId, item.menuItemId, item.quantity, menuItem.price]);
    }

    // Get full order details
    const order = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const orderItems = await all(`
      SELECT oi.*, mi.name, mi.description 
      FROM order_items oi 
      JOIN menu_items mi ON oi.menu_item_id = mi.id 
      WHERE oi.order_id = ?
    `, [orderId]);

    res.status(201).json({
      order: { ...order, items: orderItems },
      message: 'Order placed successfully!'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Admin Staff, Menu & Promo Management
app.post('/api/admin/staff', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role, salary } = req.body;

    if (!['delivery', 'kitchen'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const userId = role + '_' + Date.now();
    const passwordHash = bcrypt.hashSync(password, 10);
    const staffSalary = parseFloat(salary || 0);

    await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone, salary) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, email, passwordHash, role, firstName, lastName, phone, staffSalary]);

    if (staffSalary > 0) {
      const txId = 'tx_' + Date.now();
      await run("INSERT INTO transactions (id, type, amount, description) VALUES (?, 'salary', ?, ?)",
        [txId, staffSalary, `Initial salary payment for ${firstName} ${lastName}`]);
    }

    res.status(201).json({ id: userId, firstName, lastName, email, role, salary: staffSalary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/staff', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const staff = await all('SELECT id, first_name, last_name, email, phone, role, salary FROM users WHERE role IN ("delivery", "kitchen")');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/staff/:id', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, salary, password, adminPassword } = req.body;
    
    // Verify admin password
    const admin = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(adminPassword, admin.password_hash)) {
      return res.status(403).json({ error: 'Invalid admin password' });
    }

    const staffSalary = parseFloat(salary || 0);
    let sql = 'UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, role = ?, salary = ?';
    const params = [firstName, lastName, email, phone, role, staffSalary];

    if (password) {
      sql += ', password_hash = ?';
      params.push(bcrypt.hashSync(password, 10));
    }

    sql += ' WHERE id = ?';
    params.push(req.params.id);

    await run(sql, params);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/staff/:id', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { adminPassword } = req.body;
    
    const admin = await get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(adminPassword, admin.password_hash)) {
      return res.status(403).json({ error: 'Invalid admin password' });
    }

    if (req.user.id === req.params.id) {
       return res.status(400).json({ error: 'Cannot delete your own admin account' });
    }

    await run('DELETE FROM users WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/promos', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const promos = await all('SELECT * FROM promo_codes ORDER BY created_at DESC');
    res.json(promos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/promos', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { code, discountPercent } = req.body;
    const id = 'promo_' + Date.now();
    await run('INSERT INTO promo_codes (id, code, discount_percent) VALUES (?, ?, ?)',
      [id, code.toUpperCase(), discountPercent]);
    res.status(201).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/my-orders', authenticateToken, async (req, res) => {
  try {
    const orders = await all('SELECT * FROM orders WHERE customer_id = ? ORDER BY created_at DESC', [req.user.id]);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await all(`
        SELECT oi.*, mi.name, mi.description 
        FROM order_items oi 
        JOIN menu_items mi ON oi.menu_item_id = mi.id 
        WHERE oi.order_id = ?
      `, [order.id]);
      return { ...order, items };
    }));

    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', authenticateToken, async (req, res) => {
  try {
    const order = await get('SELECT * FROM orders WHERE id = ? AND customer_id = ?', [req.params.id, req.user.id]);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const items = await all(`
      SELECT oi.*, mi.name, mi.description 
      FROM order_items oi 
      JOIN menu_items mi ON oi.menu_item_id = mi.id 
      WHERE oi.order_id = ?
    `, [order.id]);

    res.json({ ...order, items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Kitchen endpoints - protected with role-based auth
app.get('/api/kitchen/orders', authenticateToken, requireKitchenRole, async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const orders = await all('SELECT * FROM orders WHERE status = ? ORDER BY created_at ASC', [status]);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await all(`
        SELECT oi.*, mi.name, mi.description 
        FROM order_items oi 
        JOIN menu_items mi ON oi.menu_item_id = mi.id 
        WHERE oi.order_id = ?
      `, [order.id]);
      return { ...order, items };
    }));

    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/kitchen/orders/:id/status', authenticateToken, requireKitchenRole, async (req, res) => {
  try {
    const { status, estimatedTime } = req.body;
    if (!['preparing', 'ready'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status === 'preparing' && estimatedTime) {
      // Calculate delivery time by adding estimatedTime minutes to current time
      const estimatedDeliveryTime = new Date(Date.now() + estimatedTime * 60000).toISOString();
      await run('UPDATE orders SET status = ?, estimated_delivery_time = ? WHERE id = ?', [status, estimatedDeliveryTime, req.params.id]);
    } else {
      await run('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    }
    
    const order = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Middleware for Admin and Delivery roles moved to top

// Admin Endpoints
app.get('/api/admin/orders', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const orders = await all(`
      SELECT o.*, u.first_name as driver_name 
      FROM orders o 
      LEFT JOIN users u ON o.driver_id = u.id 
      ORDER BY o.created_at DESC
    `);

    // Add items to orders
    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await all(`
        SELECT oi.*, mi.name, mi.description 
        FROM order_items oi 
        JOIN menu_items mi ON oi.menu_item_id = mi.id 
        WHERE oi.order_id = ?
      `, [order.id]);
      return { ...order, items };
    }));

    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/drivers', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const drivers = await all('SELECT id, first_name, last_name, email, phone FROM users WHERE role = "delivery"');
    res.json(drivers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/orders/:id/assign', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { driverId } = req.body;
    await run('UPDATE orders SET driver_id = ? WHERE id = ?', [driverId, req.params.id]);
    res.json({ success: true, message: 'Driver assigned' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/drivers', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password } = req.body;

    // Check if email exists
    const existing = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) {
      return res.status(400).json({ error: 'Email already exists' });
    }

    const userId = 'driver_' + Date.now();
    const passwordHash = bcrypt.hashSync(password, 10);

    await run('INSERT INTO users (id, email, password_hash, role, first_name, last_name, phone) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, email, passwordHash, 'delivery', firstName, lastName, phone]);

    res.status(201).json({ id: userId, firstName, lastName, email, role: 'delivery' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/customers', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const customers = await all('SELECT id, first_name, last_name, email, phone, loyalty_points FROM users WHERE role = "customer"');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/transactions', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const transactions = await all('SELECT * FROM transactions ORDER BY created_at DESC');
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/transactions', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { type, amount, description } = req.body;
    const id = 'tx_' + Date.now();
    await run('INSERT INTO transactions (id, type, amount, description) VALUES (?, ?, ?, ?)',
      [id, type, amount, description]);
    res.status(201).json({ id, type, amount, description });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/settings', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const rate = await get("SELECT value FROM settings WHERE key = 'loyalty_rate'");
    res.json({ loyaltyRate: rate ? rate.value : 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/settings', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { loyaltyRate } = req.body;
    await run(`
      INSERT INTO settings (id, key, value) VALUES ('s1', 'loyalty_rate', ?)
      ON CONFLICT(key) DO UPDATE SET value = ?
    `, [loyaltyRate, loyaltyRate]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/pos-order', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { items, tableName } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ error: 'No items' });

    let subtotal = 0;
    const priceMap = {};
    for (const item of items) {
       const mi = await get('SELECT name, price FROM menu_items WHERE id = ?', [item.menuItemId]);
       subtotal += mi.price * item.quantity;
       priceMap[item.menuItemId] = mi.price;
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;
    const orderId = 'pos_' + Date.now();

    await run(`
      INSERT INTO orders (id, subtotal, delivery_fee, tax, total, payment_status, status, delivery_address, delivery_phone, table_name)
      VALUES (?, ?, 0, ?, ?, 'pending', 'pending', ?, 'POS Order', ?)
    `, [orderId, subtotal, tax, total, tableName + ' - Dine In', tableName]);

    for (const item of items) {
      await run('INSERT INTO order_items (id, order_id, menu_item_id, quantity, price_at_time) VALUES (?, ?, ?, ?, ?)',
        ['oi_' + Date.now() + Math.random(), orderId, item.menuItemId, item.quantity, priceMap[item.menuItemId]]);
    }

    const fullOrder = await get('SELECT * FROM orders WHERE id = ?', [orderId]);
    const fullItems = await all(`
      SELECT oi.*, mi.name FROM order_items oi 
      JOIN menu_items mi ON oi.menu_item_id = mi.id 
      WHERE oi.order_id = ?
    `, [orderId]);

    res.status(201).json({ success: true, order: { ...fullOrder, items: fullItems } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/open-tables', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const period = req.query.period || 'day';
    let dateFilter = "";
    if (period === 'week') dateFilter = "AND date(created_at) >= date('now', '-7 days')";
    else if (period === 'month') dateFilter = "AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')";
    else if (period === 'day') dateFilter = "AND date(created_at) = date('now')";

    const orders = await all(`SELECT * FROM orders WHERE id LIKE 'pos_%' ${dateFilter} ORDER BY created_at DESC`);
    for (const o of orders) {
      o.items = await all(`
        SELECT oi.*, mi.name FROM order_items oi 
        JOIN menu_items mi ON oi.menu_item_id = mi.id 
        WHERE oi.order_id = ?
      `, [o.id]);
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/pos-order/:id/pay', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const order = await get("SELECT * FROM orders WHERE id = ? AND id LIKE 'pos_%'", [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'Already paid' });

    await run("UPDATE orders SET payment_status = 'paid', status = 'delivered' WHERE id = ?", [req.params.id]);
    
    const txId = 'tx_' + Date.now();
    await run("INSERT INTO transactions (id, type, amount, description, order_id) VALUES (?, 'income', ?, ?, ?)",
      [txId, order.total, `POS Payment - ${order.table_name || 'POS'}`, order.id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/customers', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const customers = await all('SELECT id, first_name, last_name, email, phone, loyalty_points FROM users WHERE role = "customer"');
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/admin/users/:id/loyalty', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { points } = req.body;
    await run('UPDATE users SET loyalty_points = ? WHERE id = ?', [points, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Menu Management
app.post('/api/admin/menu', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { name, description, price, categoryId, imageUrl } = req.body;
    const itemId = 'item_' + Date.now();

    // Get max display order
    const maxOrder = await get('SELECT MAX(display_order) as max FROM menu_items WHERE category_id = ?', [categoryId]);
    const displayOrder = (maxOrder?.max || 0) + 1;

    await run(`
      INSERT INTO menu_items (id, category_id, name, description, price, image_url, display_order)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [itemId, categoryId, name, description, price, imageUrl, displayOrder]);

    const newItem = await get('SELECT * FROM menu_items WHERE id = ?', [itemId]);
    res.status(201).json(newItem);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/admin/menu/:id', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    // Soft delete usually better, but for now hard delete or set unavailable
    await run('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/settings', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const rate = await get("SELECT value FROM settings WHERE key = 'loyalty_rate'");
    res.json({ loyaltyRate: rate ? rate.value : 1 });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/admin/settings', authenticateToken, requireAdminRole, async (req, res) => {
  try {
    const { loyaltyRate } = req.body;
    await run("INSERT INTO settings (id, key, value) VALUES ('s1', 'loyalty_rate', ?) ON CONFLICT(key) DO UPDATE SET value = ?", [loyaltyRate, loyaltyRate]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delivery Endpoints
// Get all ready (unassigned) orders any driver can claim
app.get('/api/delivery/ready-orders', authenticateToken, requireDeliveryRole, async (req, res) => {
  try {
    const orders = await all(`
      SELECT o.*, u.first_name as customer_name
      FROM orders o
      LEFT JOIN users u ON o.customer_id = u.id
      WHERE o.status = 'ready' AND (o.driver_id IS NULL OR o.driver_id = '')
      ORDER BY o.created_at ASC
    `);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await all(`
        SELECT oi.*, mi.name, mi.description 
        FROM order_items oi 
        JOIN menu_items mi ON oi.menu_item_id = mi.id 
        WHERE oi.order_id = ?
      `, [order.id]);
      return { ...order, items };
    }));

    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders assigned to this driver
app.get('/api/delivery/orders', authenticateToken, requireDeliveryRole, async (req, res) => {
  try {
    // Show orders assigned to this driver that are ready or already out for delivery
    const orders = await all(`
      SELECT * FROM orders 
      WHERE driver_id = ? 
      AND status IN ('ready', 'picked_up', 'delivered')
      ORDER BY created_at DESC
    `, [req.user.id]);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
      const items = await all(`
        SELECT oi.*, mi.name, mi.description 
        FROM order_items oi 
        JOIN menu_items mi ON oi.menu_item_id = mi.id 
        WHERE oi.order_id = ?
      `, [order.id]);
      return { ...order, items };
    }));

    res.json(ordersWithItems);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/delivery/orders/:id/status', authenticateToken, requireDeliveryRole, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['picked_up', 'delivered'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    if (status === 'picked_up') {
      // Driver is claiming an unassigned ready order — self-assign
      const order = await get('SELECT id, driver_id, status FROM orders WHERE id = ?', [req.params.id]);
      if (!order) return res.status(404).json({ error: 'Order not found' });
      if (order.status !== 'ready') return res.status(400).json({ error: 'Order is not ready for pickup' });
      if (order.driver_id && order.driver_id !== req.user.id) {
        return res.status(409).json({ error: 'Order already claimed by another driver' });
      }
      await run('UPDATE orders SET status = ?, driver_id = ? WHERE id = ?',
        ['picked_up', req.user.id, req.params.id]);
    } else {
      // Marking as delivered — must already be assigned to this driver
      const result = await run('UPDATE orders SET status = ? WHERE id = ? AND driver_id = ?',
        [status, req.params.id, req.user.id]);
    }

    const updated = await get('SELECT * FROM orders WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Status updated', order: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Serve built React frontend in production ──
const distPath = join(__dirname, '..', 'frontend', 'dist');
if (existsSync(distPath)) {
  app.use(express.static(distPath));
  // SPA fallback — ONLY for non-API routes so React Router works
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next(); // never intercept API calls
    res.sendFile(join(distPath, 'index.html'));
  });
  console.log('📦 Serving static frontend from', distPath);
} else {
  console.log('⚠️  No frontend dist found — API-only mode');
}

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 API ready at http://localhost:${PORT}/api`);
});
