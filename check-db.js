import sqlite3 from 'sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new sqlite3.Database(join(__dirname, 'backend', 'delivery.db'));

db.all('SELECT email, role, first_name, last_name FROM users', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('\n=== All Users in Database ===');
    rows.forEach(row => {
        console.log(`Email: ${row.email}`);
        console.log(`Role: ${row.role}`);
        console.log(`Name: ${row.first_name} ${row.last_name}`);
        console.log('---');
    });

    db.close();
});
