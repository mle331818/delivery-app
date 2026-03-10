import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'delivery.db'));

const newTime = new Date(Date.now() + 45 * 60000).toISOString();

db.run(
    "UPDATE orders SET status = 'preparing', estimated_delivery_time = ? WHERE status IN ('pending', 'ready', 'preparing') AND customer_id = 'user1'",
    [newTime],
    function(err) {
        if (err) console.error(err);
        else console.log(`Updated ${this.changes} orders`);
    }
);
