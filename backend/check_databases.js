
import sqlite3 from 'sqlite3';
import path from 'path';

async function checkDb(dbPath, label) {
  console.log(`--- Checking ${label} ---`);
  const db = new sqlite3.Database(dbPath);
  const all = (sql) => new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

  try {
    const categories = await all('SELECT COUNT(*) as count FROM categories');
    const items = await all('SELECT COUNT(*) as count FROM menu_items');
    // Try to get users, handle if table doesn't exist
    let usersCount = 0;
    try {
        const users = await all('SELECT COUNT(*) as count FROM users');
        usersCount = users[0].count;
    } catch(e) {}
    
    console.log(`Categories: ${categories[0].count}`);
    console.log(`Menu Items: ${items[0].count}`);
    console.log(`Users: ${usersCount}`);
    
    if (items[0].count > 0) {
      const firstItems = await all('SELECT name, price FROM menu_items LIMIT 3');
      console.log('Sample Items:', firstItems);
    }
  } catch (err) {
    console.error(`Error checking ${label}:`, err.message);
  } finally {
    db.close();
  }
}

async function run() {
  await checkDb(path.join(process.cwd(), 'backend', 'delivery.db'), 'NODE DB');
  await checkDb(path.join(process.cwd(), 'php_backend', 'delivery.db'), 'PHP DB');
}

run();
