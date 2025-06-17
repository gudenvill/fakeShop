// ============================================================================
// ORDER API ROUTES - HANTERAR ALLA ORDERRELATERADE ENDPOINTS
// ============================================================================
// Detta är route-filen som hanterar alla HTTP-förfrågningar för ordrar:
// - GET /api/orders - Hämta alla ordrar med sammandrag av produkter
// - GET /api/orders/:id - Hämta specifik order med alla produkter
// - POST /api/orders - Skapa ny order (från checkout-processen)
// - PUT /api/orders/:id/status - Uppdatera orderstatus (admin-funktion)

// ============================================================================
// IMPORTERA NÖDVÄNDIGA MODULER
// ============================================================================

// Express Router för att skapa modulära route-hanterare
const express = require('express');

// Skapa en ny router-instans för order-endpoints
const router = express.Router();

// Importera databasanslutningen
const db = require('../models/database');

// ============================================================================
// HJÄLPFUNKTIONER
// ============================================================================

/**
 * Generera unikt ordernummer
 * 
 * Skapar ett unikt ordernummer baserat på tidsstämpel och slumptal
 * Format: ORD-{timestamp}{random} (t.ex. ORD-789123456)
 * 
 * @returns {string} Unikt ordernummer
 */
function generateOrderNumber() {
  // Hämta de sista 6 siffrorna från nuvarande tidsstämpel
  const timestamp = Date.now().toString().slice(-6);
  
  // Generera ett 3-siffrigt slumptal med padding
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  
  // Kombinera till ordernummer med prefix
  return `ORD-${timestamp}${random}`;
}

// ============================================================================
// GET ENDPOINTS - HÄMTA ORDERDATA
// ============================================================================

/**
 * GET /api/orders - Hämta alla ordrar med sammandrag
 * 
 * Returnerar alla ordrar med en sammandragstext av vilka produkter som ingår
 * Använder GROUP_CONCAT för att sammanfoga produktnamn och antal
 * Ordning: Nyaste ordrar först
 * 
 * Response: Array med orderobjekt inklusive items_summary
 */
router.get('/', (req, res) => {
  // Komplex SQL-query som:
  // 1. Hämtar all orderdata från orders-tabellen
  // 2. Joinar med order_items för att få produktinformation
  // 3. Grupperar efter order-ID för att sammanfoga produkter
  // 4. Skapar en items_summary med produktnamn och antal
  const sql = `
    SELECT o.*, 
           GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, ', ') as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  
  // Exekvera databasfrågan
  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error('❌ Fel vid hämtning av ordrar:', err.message);
      res.status(500).json({ error: 'Serverfel vid hämtning av ordrar' });
    } else {
      console.log('✅ Hämtade', rows.length, 'ordrar från databasen');
      res.json(rows);
    }
  });
});

/**
 * GET /api/orders/:id - Hämta en specifik order med alla produkter
 * 
 * Returnerar detaljerad information om en order inklusive alla produkter
 * Utför två separata queries för att få orderhuvud och orderrader
 * 
 * URL parameter: id - orderns ID
 * Response: Orderobjekt med items-array eller 404 om inte hittad
 */
router.get('/:id', (req, res) => {
  const orderId = req.params.id;
  
  // ========================================================================
  // STEG 1: HÄMTA ORDERINFORMATION
  // ========================================================================
  
  // SQL för att hämta huvudorder-information
  const orderSql = 'SELECT * FROM orders WHERE id = ?';
  
  db.get(orderSql, [orderId], (err, order) => {
    if (err) {
      console.error('❌ Fel vid hämtning av order:', err.message);
      res.status(500).json({ error: 'Serverfel' });
      return;
    }
    
    // Kontrollera om ordern existerar
    if (!order) {
      res.status(404).json({ error: 'Order hittades inte' });
      return;
    }
    
    // ========================================================================
    // STEG 2: HÄMTA ORDERRADER (PRODUKTER)
    // ========================================================================
    
    // SQL för att hämta alla produkter som ingår i ordern
    const itemsSql = 'SELECT * FROM order_items WHERE order_id = ?';
    
    db.all(itemsSql, [orderId], (err, items) => {
      if (err) {
        console.error('❌ Fel vid hämtning av order items:', err.message);
        res.status(500).json({ error: 'Serverfel' });
        return;
      }
      
      // ========================================================================
      // STEG 3: KOMBINERA OCH RETURNERA KOMPLETT ORDERDATA
      // ========================================================================
      
      // Lägg till produktarray till orderobjetket
      order.items = items;
      console.log('✅ Hämtade order med', items.length, 'items');
      res.json(order);
    });
  });
});

// ============================================================================
// POST ENDPOINTS - SKAPA NYA ORDRAR
// ============================================================================

/**
 * POST /api/orders - Skapa ny order (används från checkout)
 * 
 * Detta är huvudendpointen för checkout-processen som:
 * 1. Validerar orderdata
 * 2. Beräknar totalsumma
 * 3. Skapar order i orders-tabellen
 * 4. Lägger till alla produkter i order_items-tabellen
 * 5. Uppdaterar orderstatus till completed
 * 
 * Body: Orderdata med customer_*, shipping_address, payment_method och items-array
 * Response: Orderbekräftelse med order_id och order_number
 */
router.post('/', (req, res) => {
  // ========================================================================
  // EXTRAHERA ORDERDATA FRÅN REQUEST BODY
  // ========================================================================
  
  const {
    customer_name,          // Kundens fullständiga namn
    customer_email,         // Kundens e-postadress
    customer_phone,         // Telefonnummer (valfritt)
    shipping_address,       // Leveransadress
    billing_address,        // Fakturaadress (valfritt)
    payment_method,         // Betalningsmetod (card, swish, etc.)
    items                   // Array med produkter från varukorgen
  } = req.body;
  
  // ========================================================================
  // VALIDERING AV OBLIGATORISKA FÄLT
  // ========================================================================
  
  // Kontrollera att alla obligatoriska fält finns med
  if (!customer_name || !customer_email || !shipping_address || !items || items.length === 0) {
    return res.status(400).json({ 
      error: 'Namn, email, adress och produkter krävs' 
    });
  }
  
  // ========================================================================
  // BERÄKNA TOTALSUMMA OCH GENERERA ORDERNUMMER
  // ========================================================================
  
  // Summera pris × antal för alla produkter
  const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Generera unikt ordernummer
  const order_number = generateOrderNumber();
  
  // ========================================================================
  // SKAPA HUVUDORDERN I ORDERS-TABELLEN
  // ========================================================================
  
  // SQL för att skapa ny order med status 'pending'
  const orderSql = `
    INSERT INTO orders 
    (order_number, customer_name, customer_email, customer_phone, shipping_address, billing_address, total_amount, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;
  
  // Exekvera order-skapandet
  db.run(orderSql, [
    order_number,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    billing_address,
    total_amount,
    payment_method
  ], function(err) {
    if (err) {
      console.error('❌ Fel vid skapande av order:', err.message);
      res.status(500).json({ error: 'Kunde inte skapa order' });
      return;
    }
    
    // Hämta det autogenererade order-ID:t
    const orderId = this.lastID;
    console.log('✅ Order skapad med ID:', orderId);
    
    // ========================================================================
    // LÄGG TILL ORDERRADER I ORDER_ITEMS-TABELLEN
    // ========================================================================
    
    // SQL för att lägga till produkter till ordern
    const itemsSql = `
      INSERT INTO order_items 
      (order_id, product_id, product_name, product_brand, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    // Räknare för att hålla koll på bearbetade produkter
    let itemsProcessed = 0;
    let hasError = false;
    
    // ========================================================================
    // LOOPA IGENOM OCH LÄGG TILL VARJE PRODUKT
    // ========================================================================
    
    items.forEach(item => {
      // Beräkna delsumma för denna produkt
      const subtotal = item.price * item.quantity;
      
      // Lägg till produkten i order_items-tabellen
      db.run(itemsSql, [
        orderId,           // Order-ID från den skapade ordern
        item.id,           // Produkt-ID
        item.name,         // Produktnamn (kopia för historik)
        item.brand,        // Märke (kopia för historik)
        item.price,        // Pris per enhet vid köptillfället
        item.quantity,     // Antal
        subtotal          // Beräknad delsumma
      ], (err) => {
        // Hantera fel vid infogning av produkter
        if (err && !hasError) {
          hasError = true;
          console.error('❌ Fel vid tillägg av order item:', err.message);
          res.status(500).json({ error: 'Kunde inte lägga till produkter' });
          return;
        }
        
        // ========================================================================
        // KONTROLLERA OM ALLA PRODUKTER ÄR BEARBETADE
        // ========================================================================
        
        itemsProcessed++;
        
        // Om alla produkter är bearbetade och inga fel uppstått
        if (itemsProcessed === items.length && !hasError) {
          
          // ========================================================================
          // SLUTFÖR ORDERN GENOM ATT UPPDATERA STATUS
          // ========================================================================
          
          // Uppdatera order status från 'pending' till 'completed'
          db.run('UPDATE orders SET status = "completed" WHERE id = ?', [orderId], (err) => {
            if (err) {
              console.error('❌ Fel vid uppdatering av order status:', err.message);
            }
            
            // ========================================================================
            // RETURNERA FRAMGÅNGSRIKT SVAR
            // ========================================================================
            
            // Skicka bekräftelse tillbaka till frontend
            res.status(201).json({
              success: true,
              order_id: orderId,            // För omdirigering till bekräftelsesida
              order_number: order_number,   // För visning till kund
              total_amount: total_amount,   // Bekräftelse på totalsumma
              message: 'Order skapad framgångsrikt'
            });
            
            console.log('✅ Order slutförd:', order_number);
          });
        }
      });
    });
  });
});

// ============================================================================
// PUT ENDPOINTS - UPPDATERA ORDERDATA
// ============================================================================

/**
 * PUT /api/orders/:id/status - Uppdatera order status (Admin-funktion)
 * 
 * Tillåter administratörer att ändra status på befintliga ordrar
 * Validerar att endast giltiga statusvärden används
 * 
 * URL parameter: id - orderns ID
 * Body: { status: "pending|completed|cancelled|shipped" }
 * Response: Bekräftelse eller felmeddelande
 */
router.put('/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  // ========================================================================
  // VALIDERA ORDERSTATUS
  // ========================================================================
  
  // Lista över giltiga statusvärden
  const validStatuses = ['pending', 'completed', 'cancelled', 'shipped'];
  
  // Kontrollera att angiven status är giltig
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ogiltig status' });
  }
  
  // ========================================================================
  // UPPDATERA ORDERSTATUS I DATABASEN
  // ========================================================================
  
  // SQL för att uppdatera status och updated_at-tidsstämpel
  const sql = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(sql, [status, orderId], function(err) {
    if (err) {
      console.error('❌ Fel vid uppdatering av order status:', err.message);
      res.status(500).json({ error: 'Kunde inte uppdatera order' });
    } else if (this.changes === 0) {
      // Inga rader påverkades - ordern existerar inte
      res.status(404).json({ error: 'Order hittades inte' });
    } else {
      // Framgångsrik uppdatering
      console.log('✅ Order status uppdaterad:', orderId, 'till', status);
      res.json({ 
        success: true, 
        message: `Order status uppdaterad till ${status}` 
      });
    }
  });
});

// ============================================================================
// EXPORTERA ROUTER
// ============================================================================

// Exportera router så den kan användas i huvudapplikationen
module.exports = router; 