// ============================================================================
// FAKESHOP BACKEND SERVER - HUVUDAPPLIKATIONSFIL
// ============================================================================
// Detta är huvudfilen för FakeShop's backend server som hanterar:
// - API-endpoints för produkter och beställningar
// - Statisk filservering för frontend
// - Databasinitialisering
// - CORS och middleware-konfiguration

// ============================================================================
// IMPORTERA NÖDVÄNDIGA NPM-PAKET OCH MODULER
// ============================================================================

// Express.js - Webbapplikationsramverk för Node.js
const express = require('express');

// CORS - Cross-Origin Resource Sharing för att tillåta frontend att kommunicera med backend
const cors = require('cors');

// Body Parser - För att parsea HTTP request bodies (JSON och URL-encoded data)
const bodyParser = require('body-parser');

// Path - Node.js inbyggd modul för att hantera fil- och mappvägar
const path = require('path');

// Importera vår egen databasmoduls initialiseringsfunktion
const { initDatabase } = require('./models/init-database');

// ============================================================================
// IMPORTERA VÅRA EGNA ROUTE-HANTERARE
// ============================================================================

// Route-hanterare för produktrelaterade API-endpoints (/api/products)
const productRoutes = require('./routes/products');

// Route-hanterare för orderrelaterade API-endpoints (/api/orders)
const orderRoutes = require('./routes/orders');

// ============================================================================
// SKAPA OCH KONFIGURERA EXPRESS-APPLIKATIONEN
// ============================================================================

// Skapa en ny Express-applikationsinstans
const app = express()

// Definiera vilken port servern ska köra på (använd miljövariabel eller standard 3000)
const PORT = process.env.PORT || 3000;

// ============================================================================
// MIDDLEWARE-KONFIGURATION
// ============================================================================
// Middleware är funktioner som körs innan route-hanterarna och kan
// modifiera request/response-objekt eller avsluta request-cykeln

// CORS-middleware: Tillåter frontend att göra API-anrop från andra domäner/portar
app.use(cors());

// JSON Body Parser: Tolkar JSON-data i request bodies och gör den tillgänglig via req.body
app.use(bodyParser.json());

// URL-encoded Body Parser: Tolkar formulärdata och gör den tillgänglig via req.body
// extended: true tillåter rika objekt och arrays att kodas till URL-encoded format
app.use(bodyParser.urlencoded({ extended: true }));

// ============================================================================
// STATISK FILSERVERING
// ============================================================================

// Servera statiska filer (HTML, CSS, JS, bilder) från public-mappen
// Detta gör att vi kan nå frontend-filer direkt via webbläsaren
app.use(express.static(path.join(__dirname, '../public')));

// ============================================================================
// API ROUTE-KONFIGURATION
// ============================================================================

// Alla routes som börjar med '/api/products' hanteras av productRoutes
// Exempel: GET /api/products, POST /api/products, etc.
app.use('/api/products', productRoutes);

// Alla routes som börjar med '/api/orders' hanteras av orderRoutes  
// Exempel: GET /api/orders, POST /api/orders, etc.
app.use('/api/orders', orderRoutes);

// ============================================================================
// SPECIFIKA ROUTE-HANTERARE
// ============================================================================

// Test-endpoint för att kontrollera att backend-servern fungerar
// Användbar för utveckling och felsökning
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend är igång!' });
});

// Huvudsida: Servera index.html när användare går till root-URL (/)
// Detta fungerar som fallback för SPA (Single Page Application) routing
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// ============================================================================
// DATABASINITIALISERING
// ============================================================================

// Initiera SQLite-databasen med tabeller och testdata
// Detta körs när servern startar för att säkerställa att databasen är redo
initDatabase();

// ============================================================================
// SERVERSTART
// ============================================================================

// Starta HTTP-servern och lyssna på specificerad port
app.listen(PORT, () => {
    // Logga framgångsrikt serverstart med användbara utvecklingsinformation
    console.log(`🚀 FakeShop server är igång på http://localhost:${PORT}`);
    console.log(`📁 Serverar statiska filer från: ${path.join(__dirname, '../public')}`);
    console.log(`🗄️  SQLite databas initialiserad`);
    console.log(`🔧 API endpoints tillgängliga på /api/products och /api/orders`);
    console.log(`🌐 Test endpoint: http://localhost:${PORT}/api/test`);
});