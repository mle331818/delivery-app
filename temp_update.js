const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('backend/delivery.db');
db.run("UPDATE orders SET status = 'preparing', estimated_delivery_time = '2026-03-10T11:45:00.000Z' WHERE customer_id = 'user1'", err => console.log(err || 'done'));
