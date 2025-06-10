const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Vägen till databasen
const dbPath = path.join(__dirname, '../../database.sqlite');

// Skapa koppling tull databasen
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error öppning databasen:', err.message); 
    } else {
        console.log('✅ Kopplad till SQLite database at:', dbPath); 
    }
});

// Tillåt foregin keys
db.run('PRAGMA foreign_keys = ON');

module.exports = db;