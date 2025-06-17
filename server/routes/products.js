// ============================================================================
// PRODUKTER API ROUTES - HANTERAR ALLA PRODUKTRELATERADE ENDPOINTS
// ============================================================================
// Detta är route-filen som hanterar alla HTTP-förfrågningar för produkter:
// - GET /api/products - Hämta alla aktiva produkter
// - GET /api/products/search/:query - Sök produkter
// - GET /api/products/:id - Hämta specifik produkt
// - POST /api/products - Skapa ny produkt
// - PUT /api/products/:id - Uppdatera befintlig produkt
// - DELETE /api/products/:id - Ta bort produkt (soft delete)
// - GET /api/products/category/:category - Hämta produkter per kategori

// ============================================================================
// IMPORTERA NÖDVÄNDIGA MODULER
// ============================================================================

// Express Router för att skapa modulära route-hanterare
const express = require('express');

// Skapa en ny router-instans för produkt-endpoints
const router = express.Router();

// Importera databasanslutningen
const db = require('../models/database');

// ============================================================================
// GET ENDPOINTS - HÄMTA PRODUKTDATA
// ============================================================================

/**
 * GET /api/products - Hämta alla aktiva produkter
 * 
 * Detta endpoint returnerar alla produkter som är markerade som aktiva (is_active = 1)
 * Produkterna sorteras efter skapandedatum med nyaste först
 * 
 * Response: Array med produktobjekt
 */
router.get('/', (req, res) => {
    // SQL-query för att hämta alla aktiva produkter, sorterat efter skapandedatum
    const sql = 'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC';

    // Exekvera databasfrågan
    db.all(sql, [], (err, rows) => {
        if (err) {
            // Logga fel och returnera 500-status med felmeddelande
            console.error('❌ Fel vid hämtning av produkter:', err.message);
            res.status(500).json({ error: 'Serverfel vid hämtning av produkter' });
        } else {
            // Logga framgångsrik hämtning och returnera produktdata
            console.log('✅ Hämtade', rows.length, 'produkter från databasen');
            res.json(rows);
        }
    });
});

/**
 * GET /api/products/search/:query - Sök produkter efter sökterm
 * 
 * Söker igenom produkter baserat på namn, märke eller beskrivning
 * Använder LIKE med wildcards för flexibel sökning
 * 
 * URL parameter: query - söktermen
 * Response: Array med matchande produkter
 */
router.get('/search/:query', (req, res) => {
  // Hämta sökterm från URL-parametrar
  const searchQuery = req.params.query;
  
  // SQL-query som söker i name, brand och description-kolumnerna
  // LIKE används för partiell matchning (innehåller söktermen)
  const sql = `
    SELECT * FROM products 
    WHERE is_active = 1 
    AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)
    ORDER BY created_at DESC
  `;
  
  // Skapa sökmönster med wildcards (% innan och efter söktermen)
  const searchPattern = `%${searchQuery}%`;
  
  // Exekvera sökning (samma sökmönster används för alla tre kolumner)
  db.all(sql, [searchPattern, searchPattern, searchPattern], (err, rows) => {
    if (err) {
      console.error('❌ Fel vid sökning av produkter:', err.message);
      res.status(500).json({ error: 'Serverfel vid sökning av produkter' });
    } else {
      console.log('✅ Hämtade', rows.length, 'produkter för sökning:', searchQuery);
      res.json(rows);
    }
  });
});

/**
 * GET /api/products/:id - Hämta en specifik produkt baserat på ID
 * 
 * Returnerar detaljerad information om en enda produkt
 * Kontrollerar att produkten är aktiv innan den returneras
 * 
 * URL parameter: id - produktens ID
 * Response: Produktobjekt eller 404 om inte hittad
 */
router.get('/:id', (req, res) => {
    // SQL för att hämta specifik produkt baserat på ID och aktiv status
    const sql = 'SELECT * FROM products WHERE id = ? AND is_active = 1';
    const productId = req.params.id;

    // Använd db.get() för att hämta en enda rad
    db.get(sql, [productId], (err, row) => {
        if (err) {
            // Databasfel - returnera 500
            console.error('❌ Fel vid hämtning av produkt:', err.message);
            res.status(500).json({ error: 'Serverfel vid hämtning av produkt' });
        } else if (row) {
            // Produkt hittad - returnera produktdata
            console.log('✅ Hämtade produkt:', row.name);
            res.json(row);
        } else {
            // Produkt inte hittad - returnera 404
            res.status(404).json({ error: 'Produkten hittades inte' });
        }
    });
});

/**
 * GET /api/products/category/:category - Hämta produkter per kategori
 * 
 * Filtrerar produkter baserat på kategori (t.ex. "tshirts", "byxor", "jackor")
 * Returnerar endast aktiva produkter i specificerad kategori
 * 
 * URL parameter: category - kategorins namn
 * Response: Array med produkter i kategorin
 */
router.get('/category/:category', (req, res) => {
    const category = req.params.category;
    
    // SQL för att hämta produkter i specifik kategori
    const sql = 'SELECT * FROM products WHERE category = ? AND is_active = 1 ORDER BY created_at DESC';

    db.all(sql, [category], (err, rows) => {
        if (err) {
            console.error('❌ Fel vid hämtning av produkter per kategori:', err.message);
            res.status(500).json({ error: 'Serverfel vid hämtning av produkter' });
        } else {
            console.log('✅ Hämtade', rows.length, 'produkter i kategorin:', category);
            res.json(rows);
        }
    });
});

// ============================================================================
// POST ENDPOINTS - SKAPA NYA PRODUKTER
// ============================================================================

/**
 * POST /api/products - Skapa ny produkt
 * 
 * Skapar en ny produkt i databasen baserat på data i request body
 * Validerar att obligatoriska fält finns med
 * Hanterar unika SKU-konflikter
 * 
 * Body: Produktdata (name, brand, description, price, sku, etc.)
 * Response: Skapad produkt med ID eller felmeddelande
 */
router.post('/', (req, res) => {
    // Destructuring för att hämta alla produktfält från request body
    const { name, brand, description, price, sku, image_url, category, stock_quantity } = req.body;

    // ========================================================================
    // VALIDERING AV OBLIGATORISKA FÄLT
    // ========================================================================
    
    // Kontrollera att alla obligatoriska fält finns med
    if (!name || !brand || !price || !sku) {
        return res.status(400).json({ error: 'Namn, märke, pris och SKU är obligatoriska' });
    }

    // ========================================================================
    // INFOGA NY PRODUKT I DATABASEN
    // ========================================================================
    
    // SQL för att skapa ny produkt
    const sql = `
      INSERT INTO products (name, brand, description, price, sku, image_url, category, stock_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Exekvera infogning (använd || 0 för att sätta default stock_quantity)
    db.run(sql, [name, brand, description, price, sku, image_url, category, stock_quantity || 0], function (err) {
        if (err) {
            console.error('❌ Fel vid skapande av produkt:', err.message);
            
            // Hantera specifikt fel för unik SKU-constraint
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'SKU finns redan' });
            } else {
                res.status(500).json({ error: 'Serverfel vid skapande av produkt' });
            }
        } else {
            // Framgångsrik skapande - returnera ny produkt med ID
            console.log('✅ Ny produkt skapad med ID:', this.lastID);
            res.status(201).json({
                id: this.lastID,
                message: 'Produkt skapad framgångsrikt',
                product: { id: this.lastID, name, brand, price, sku }
            });
        }
    });
});

// ============================================================================
// PUT ENDPOINTS - UPPDATERA BEFINTLIGA PRODUKTER
// ============================================================================

/**
 * PUT /api/products/:id - Uppdatera befintlig produkt
 * 
 * Uppdaterar all produktdata för en specifik produkt
 * Uppdaterar även updated_at-tidsstämpeln automatiskt
 * Hanterar SKU-konflikter och produkter som inte existerar
 * 
 * URL parameter: id - produktens ID
 * Body: Uppdaterad produktdata
 * Response: Bekräftelse eller felmeddelande
 */
router.put('/:id', (req, res) => {
    const productId = req.params.id;
    
    // Hämta alla uppdateringsfält från request body
    const { name, brand, description, price, sku, image_url, category, stock_quantity, is_active } = req.body;

    // ========================================================================
    // UPPDATERA PRODUKT I DATABASEN
    // ========================================================================
    
    // SQL för att uppdatera alla produktfält samt updated_at-tidsstämpel
    const sql = `
      UPDATE products 
      SET name = ?, brand = ?, description = ?, price = ?, sku = ?, 
          image_url = ?, category = ?, stock_quantity = ?, is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    // Exekvera uppdatering med alla fältvärden samt produkt-ID som sista parameter
    db.run(sql, [name, brand, description, price, sku, image_url, category, stock_quantity, is_active, productId], function (err) {
        if (err) {
            console.error('❌ Fel vid uppdatering av produkt:', err.message);
            
            // Hantera specifikt fel för unik SKU-constraint
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'SKU finns redan' });
            } else {
                res.status(500).json({ error: 'Serverfel vid uppdatering av produkt' });
            }
        } else if (this.changes === 0) {
            // Inga rader påverkades - produkten existerar inte
            res.status(404).json({ error: 'Produkten hittades inte' });
        } else {
            // Framgångsrik uppdatering
            console.log('✅ Produkt uppdaterad, ID:', productId);
            res.json({ message: 'Produkt uppdaterad framgångsrikt' });
        }
    });
});

// ============================================================================
// DELETE ENDPOINTS - TA BORT PRODUKTER
// ============================================================================

/**
 * DELETE /api/products/:id - Ta bort produkt (soft delete)
 * 
 * Utför "soft delete" genom att sätta is_active till 0 istället för att
 * ta bort produkten helt från databasen. Detta bevarar data för historiska
 * order-referenser och gör det möjligt att återställa produkter senare.
 * 
 * URL parameter: id - produktens ID
 * Response: Bekräftelse eller felmeddelande
 */
router.delete('/:id', (req, res) => {
    const productId = req.params.id;

    // ========================================================================
    // SOFT DELETE - INAKTIVERA ISTÄLLET FÖR ATT TA BORT
    // ========================================================================
    
    // SQL för soft delete - sätt is_active till 0 och uppdatera tidsstämpel
    const sql = 'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

    db.run(sql, [productId], function (err) {
        if (err) {
            console.error('❌ Fel vid borttagning av produkt:', err.message);
            res.status(500).json({ error: 'Serverfel vid borttagning av produkt' });
        } else if (this.changes === 0) {
            // Inga rader påverkades - produkten existerar inte
            res.status(404).json({ error: 'Produkten hittades inte' });
        } else {
            // Framgångsrik "borttagning" (inaktivering)
            console.log('✅ Produkt borttagen (inaktiverad), ID:', productId);
            res.json({ message: 'Produkt borttagen framgångsrikt' });
        }
    });
});

// ============================================================================
// EXPORTERA ROUTER
// ============================================================================

// Exportera router så den kan användas i huvudapplikationen
module.exports = router;