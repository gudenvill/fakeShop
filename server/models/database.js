// ============================================================================
// DATABASANSLUTNING - SQLITE3 KONFIGURATION FÖR FAKESHOP
// ============================================================================
// Detta är huvudfilen för databasanslutning som:
// - Etablerar anslutning till SQLite-databasen
// - Konfigurerar databasalternativ som foreign keys
// - Exporterar databasinstansen för användning i andra moduler

// ============================================================================
// IMPORTERA NÖDVÄNDIGA MODULER
// ============================================================================

// SQLite3 driver med verbose-läge för detaljerad felrapportering
const sqlite3 = require('sqlite3').verbose();

// Path-modul för att hantera filvägar på ett plattformsoberoende sätt
const path = require('path');

// ============================================================================
// DATABASVÄG OCH ANSLUTNINGSKONFIGURATION
// ============================================================================

// Skapa absolut väg till databasensfilen
// __dirname pekar på aktuell mapp (server/models/)
// Vi går upp två nivåer för att nå projektets rotmapp
const dbPath = path.join(__dirname, '../../database.sqlite');

// ============================================================================
// DATABASANSLUTNING
// ============================================================================

// Skapa ny SQLite-databasanslutning
// Om filen inte finns skapas den automatiskt
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        // Logga detaljerat felmeddelande om anslutningen misslyckas
        console.error('❌ Error öppning databasen:', err.message); 
    } else {
        // Bekräfta framgångsrik anslutning med databasväg
        console.log('✅ Kopplad till SQLite database at:', dbPath); 
    }
});

// ============================================================================
// DATABASKONFIGURATION
// ============================================================================

// Aktivera foreign key constraints för att säkerställa referentiell integritet
// Detta säkerställer att relationer mellan tabeller respekteras
// (t.ex. att order_items alltid refererar till giltiga products och orders)
db.run('PRAGMA foreign_keys = ON');

// ============================================================================
// EXPORTERA DATABASINSTANSEN
// ============================================================================

// Exportera databasanslutningen så att andra moduler kan använda den
// Detta gör att vi kan importera samma databasinstans överallt i applikationen
module.exports = db;