const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.db');

const regionalId = 'c187019b-956d-486a-b547-b9ce7a997e98';

db.all('SELECT id, nome FROM colaboradores WHERE regional_id = ?', 
    [regionalId], 
    (err, rows) => {
        if (err) {
            console.error('Erro:', err);
        } else {
            console.log('👥 Colaboradores em Alta Floresta Doeste:');
            console.table(rows);
            console.log(`\nTotal: ${rows.length} colaboradores`);
        }
        db.close();
    });
