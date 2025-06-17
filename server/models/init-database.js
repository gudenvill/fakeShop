// ============================================================================
// DATABASINITIALISERING - SKAPA TABELLER OCH TESTDATA FÖR FAKESHOP
// ============================================================================
// Detta är filen som ansvarar för att:
// - Skapa alla nödvändiga databastabeller (products, orders, order_items)
// - Fylla databasen med exempeldata för utveckling och testning
// - Säkerställa att foreign key-relationer fungerar korrekt
// - Hantera datum för att simulera "nya" och "gamla" produkter

// ============================================================================
// IMPORTERA DATABASANSLUTNING
// ============================================================================

// Importera den konfigurerade SQLite-databasanslutningen
const db = require('./database');

// ============================================================================
// TABELLSKAPANDE FUNKTIONER
// ============================================================================

/**
 * Skapa produkttabell (products)
 * Innehåller all information om produkter som finns i butiken
 */
const createProductsTable = () => {
  // SQL för att skapa produkttabellen med alla nödvändiga fält
  const sql = `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,    -- Unikt ID för varje produkt
      name VARCHAR(100) NOT NULL,              -- Produktnamn (obligatoriskt)
      brand VARCHAR(50) NOT NULL,              -- Märke/tillverkare (obligatoriskt)
      description TEXT,                        -- Produktbeskrivning (valfritt)
      price DECIMAL(10,2) NOT NULL,            -- Pris i SEK med 2 decimaler
      sku VARCHAR(20) UNIQUE NOT NULL,         -- Stock Keeping Unit - unikt artikelnummer
      image_url VARCHAR(255),                  -- URL till produktbild
      category VARCHAR(50),                    -- Produktkategori (t-shirts, byxor, etc.)
      stock_quantity INTEGER DEFAULT 0,        -- Antal i lager
      is_active BOOLEAN DEFAULT 1,             -- Om produkten är aktiv (visas i butiken)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- Skapandedatum
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- Senast uppdaterad
    )
  `;

  // Exekvera SQL-kommandot för att skapa tabellen
  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Fel vid skapande av produkttabell:', err.message);
    } else {
      console.log('✅ Produkttabell skapad/verifierad');
    }
  });
};

/**
 * Skapa ordertabell (orders)
 * Innehåller huvudinformation om kundbeställningar
 */
const createOrdersTable = () => {
  // SQL för att skapa ordertabellen
  const sql = `
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,    -- Unikt order-ID
      order_number VARCHAR(20) UNIQUE NOT NULL, -- Unikt ordernummer (visas för kund)
      customer_name VARCHAR(100) NOT NULL,     -- Kundens fullständiga namn
      customer_email VARCHAR(100) NOT NULL,    -- Kundens e-postadress
      customer_phone VARCHAR(20),              -- Kundens telefonnummer (valfritt)
      shipping_address TEXT NOT NULL,          -- Leveransadress
      billing_address TEXT,                    -- Fakturaadress (om annorlunda)
      total_amount DECIMAL(10,2) NOT NULL,     -- Totalsumma för ordern
      status VARCHAR(20) DEFAULT 'pending',    -- Orderstatus (pending, completed, cancelled)
      payment_method VARCHAR(50),              -- Betalningsmetod (card, swish, etc.)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- När ordern skapades
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP   -- Senast uppdaterad
    )
  `;

  // Exekvera SQL-kommandot för att skapa tabellen
  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Fel vid skapande av ordertabell:', err.message);
    } else {
      console.log('✅ Ordertabell skapad/verifierad');
    }
  });
};

/**
 * Skapa order_items tabell
 * Innehåller detaljer om vilka produkter som ingår i varje order
 * Denna tabell skapar många-till-många-relation mellan orders och products
 */
const createOrderItemsTable = () => {
  // SQL för att skapa order_items-tabellen med foreign keys
  const sql = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,    -- Unikt ID för varje orderrad
      order_id INTEGER NOT NULL,               -- Referens till orders-tabellen
      product_id INTEGER NOT NULL,             -- Referens till products-tabellen
      product_name VARCHAR(100) NOT NULL,      -- Produktnamn (kopia för historik)
      product_brand VARCHAR(50) NOT NULL,      -- Märke (kopia för historik)
      price DECIMAL(10,2) NOT NULL,            -- Pris per enhet vid köptillfället
      quantity INTEGER NOT NULL,               -- Antal produkter
      subtotal DECIMAL(10,2) NOT NULL,         -- Delsumma (price × quantity)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,  -- När orderraden skapades
      
      -- Foreign key constraints för att säkerställa dataintegritet
      FOREIGN KEY (order_id) REFERENCES orders (id),     -- Måste referera giltig order
      FOREIGN KEY (product_id) REFERENCES products (id)  -- Måste referera giltig produkt
    )
  `;

  // Exekvera SQL-kommandot för att skapa tabellen
  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Fel vid skapande av order_items tabell:', err.message);
    } else {
      console.log('✅ Order_items tabell skapad/verifierad');
    }
  });
};

// ============================================================================
// TESTDATA-FUNKTIONER
// ============================================================================

/**
 * Lägg till exempeldata med specifika datum
 * Skapar produkter med olika åldrar för att testa "Nyhet"-funktionaliteten
 */
const insertSampleProducts = () => {
  // ============================================================================
  // DATUMBERÄKNINGAR FÖR "NYHET"-FUNKTIONALITET
  // ============================================================================
  
  // Hämta aktuellt datum som referens
  const now = new Date();
  
  // Skapa datum för "nya" produkter (senaste 3 dagarna)
  // Dessa produkter kommer att visa "Nyhet"-märkning i frontend
  const newDate1 = new Date(now);
  newDate1.setDate(now.getDate() - 1); // 1 dag sedan
  
  const newDate2 = new Date(now);
  newDate2.setDate(now.getDate() - 2); // 2 dagar sedan
  
  const newDate3 = new Date(now);
  newDate3.setDate(now.getDate() - 3); // 3 dagar sedan
  
  // Skapa datum för "gamla" produkter (mer än 7 dagar sedan)
  // Dessa produkter kommer INTE att visa "Nyhet"-märkning
  const oldDate1 = new Date(now);
  oldDate1.setDate(now.getDate() - 10); // 10 dagar sedan
  
  const oldDate2 = new Date(now);
  oldDate2.setDate(now.getDate() - 15); // 15 dagar sedan
  
  const oldDate3 = new Date(now);
  oldDate3.setDate(now.getDate() - 20); // 20 dagar sedan

  // ============================================================================
  // PRODUKTDATA-ARRAY
  // ============================================================================
  
  // Array med alla testprodukter som ska läggas till i databasen
  const products = [
    // ========================================================================
    // NYA PRODUKTER (kommer visa "Nyhet"-märkning)
    // ========================================================================
    {
      name: 'Premium T-shirt',
      brand: 'Levis',
      description: 'Premium kvalitet t-shirt i mjuk bomull',
      price: 249.00,
      sku: 'AAA111',                    // Unikt artikelnummer
      image_url: '/images/product.png',
      category: 'tshirts',
      stock_quantity: 50,
      created_at: newDate1.toISOString().slice(0, 19).replace('T', ' ')  // Formatera datum för SQLite
    },
    {
      name: 'Blå Jeans',
      brand: 'Levis',
      description: 'Klassiska blå jeans i premium denim',
      price: 599.00,
      sku: 'BBB111',
      image_url: '/images/product.png',
      category: 'byxor',
      stock_quantity: 30,
      created_at: newDate2.toISOString().slice(0, 19).replace('T', ' ')
    },
    {
      name: 'Röd Hoodie',
      brand: 'Nike',
      description: 'Varm och bekväm hoodie perfect för kallare dagar',
      price: 799.00,
      sku: 'CCC111',
      image_url: '/images/product.png',
      category: 'tröjor',
      stock_quantity: 25,
      created_at: newDate3.toISOString().slice(0, 19).replace('T', ' ')
    },
    
    // ========================================================================
    // GAMLA PRODUKTER (kommer INTE visa "Nyhet"-märkning)
    // ========================================================================
    {
      name: 'Svart Jacka',
      brand: 'Zara',
      description: 'Elegant svart jacka för alla tillfällen',
      price: 1299.00,
      sku: 'DDD111',
      image_url: '/images/product.png',
      category: 'jackor',
      stock_quantity: 15,
      created_at: oldDate1.toISOString().slice(0, 19).replace('T', ' ')
    },
    {
      name: 'Vita Sneakers',
      brand: 'Adidas',
      description: 'Klassiska vita sneakers i läder',
      price: 899.00,
      sku: 'EEE111',
      image_url: '/images/product.png',
      category: 'skor',
      stock_quantity: 40,
      created_at: oldDate2.toISOString().slice(0, 19).replace('T', ' ')
    },
    {
      name: 'Grön Keps',
      brand: 'New Era',
      description: 'Sportig keps i grön färg',
      price: 299.00,
      sku: 'FFF111',
      image_url: '/images/product.png',
      category: 'accessoarer',
      stock_quantity: 60,
      created_at: oldDate3.toISOString().slice(0, 19).replace('T', ' ')
    }
  ];

  // ============================================================================
  // INFOGA PRODUKTER I DATABASEN
  // ============================================================================
  
  // SQL-statement för att infoga produkter
  // Använd INSERT OR REPLACE för att undvika dubbletter vid upprepade körningar
  const sql = `
    INSERT OR REPLACE INTO products 
    (name, brand, description, price, sku, image_url, category, stock_quantity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  // Räknare för att hålla koll på hur många produkter som bearbetats
  let productsProcessed = 0;
  
  // Loopa igenom alla produkter och infoga dem en i taget
  products.forEach(product => {
    db.run(sql, [
      product.name,
      product.brand, 
      product.description,
      product.price,
      product.sku,
      product.image_url,
      product.category,
      product.stock_quantity,
      product.created_at,
      product.created_at  // Sätt updated_at till samma som created_at
    ], (err) => {
      if (err) {
        console.error('❌ Fel vid infogning av produkt:', err.message);
      } else {
        console.log('✅ Exempelprodukt infogad:', product.name);
      }
      
      // Öka räknaren och kontrollera om alla produkter är klara
      productsProcessed++;
      if (productsProcessed === products.length) {
        console.log('✅ Alla produkter infogade');
      }
    });
  });
};

/**
 * Lägg till exempel-order för testning
 * Skapar en komplett order med orderrader för att testa orderhanteringssystemet
 */
const insertSampleOrder = () => {
  // Vänta lite så att produkterna hinner skapas först
  setTimeout(() => {
    // ========================================================================
    // HÄMTA PRODUKTER FÖR ORDERN
    // ========================================================================
    
    // Först hämta faktiska produkt-IDs från databasen för att skapa giltig order
    db.all('SELECT id, name, brand, price FROM products WHERE sku IN ("AAA111", "BBB111") ORDER BY sku', [], (err, products) => {
      if (err || products.length < 2) {
        console.log('⚠️ Kunde inte skapa exempel-order - produkter hittades inte');
        console.log('Hittade produkter:', products);
        return;
      }
      
      // ========================================================================
      // SKAPA HUVUDORDERN
      // ========================================================================
      
      // SQL för att skapa en order i orders-tabellen
      const orderSql = `
        INSERT OR REPLACE INTO orders 
        (order_number, customer_name, customer_email, customer_phone, shipping_address, total_amount, status, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      // Beräkna totalsumma baserat på faktiska produktpriser
      // 2 st av första produkten + 1 st av andra produkten
      const totalAmount = (products[0].price * 2) + (products[1].price * 1);
      
      // Infoga ordern i databasen
      db.run(orderSql, [
        'ORD-001',                        // Unikt ordernummer
        'Anna Andersson',                 // Kundnamn
        'anna@example.com',               // Kundens e-post
        '070-123 45 67',                  // Telefonnummer
        'Storgatan 1, 123 45 Stockholm',  // Leveransadress
        totalAmount,                      // Beräknad totalsumma
        'completed',                      // Orderstatus
        'card'                            // Betalningsmetod
      ], function(err) {
        if (err) {
          console.error('❌ Fel vid infogning av exempel-order:', err.message);
        } else {
          console.log('✅ Exempel-order infogad med ID:', this.lastID);
          
          // ========================================================================
          // LÄGG TILL ORDERRADER (ORDER_ITEMS)
          // ========================================================================
          
          // SQL för att lägga till orderrader
          const itemsSql = `
            INSERT OR REPLACE INTO order_items 
            (order_id, product_id, product_name, product_brand, price, quantity, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          // Lägg till första produkten (2 st Premium T-shirt)
          db.run(itemsSql, [
            this.lastID,                    // Order-ID från den skapade ordern
            products[0].id,                 // Produkt-ID
            products[0].name,               // Produktnamn (kopia för historik)
            products[0].brand,              // Märke (kopia för historik)
            products[0].price,              // Pris per enhet
            2,                              // Antal
            products[0].price * 2           // Delsumma
          ], (err) => {
            if (err) {
              console.error('❌ Fel vid tillägg av order item 1:', err.message);
            } else {
              console.log('✅ Order item 1 infogad');
            }
          });
          
          // Lägg till andra produkten (1 st Blå Jeans)
          db.run(itemsSql, [
            this.lastID,                    // Order-ID från den skapade ordern
            products[1].id,                 // Produkt-ID
            products[1].name,               // Produktnamn
            products[1].brand,              // Märke
            products[1].price,              // Pris per enhet
            1,                              // Antal
            products[1].price * 1           // Delsumma
          ], (err) => {
            if (err) {
              console.error('❌ Fel vid tillägg av order item 2:', err.message);
            } else {
              console.log('✅ Order item 2 infogad');
              console.log('✅ Exempel-order komplett: ORD-001');
            }
          });
        }
      });
    });
  }, 3000); // Vänta 3 sekunder för att produkterna ska hinna skapas
};

// ============================================================================
// HUVUDINITIALISERINGSFUNKTION
// ============================================================================

/**
 * Initiera databas
 * Denna funktion körs när servern startar och säkerställer att:
 * 1. Alla nödvändiga tabeller existerar
 * 2. Testdata finns tillgänglig för utveckling
 */
const initDatabase = () => {
  console.log('🔧 Initialiserar FakeShop databas...');
  
  // Skapa alla nödvändiga tabeller
  createProductsTable();
  createOrdersTable();
  createOrderItemsTable();
  
  // Vänta lite för att tabellerna ska skapas, sedan lägg till exempeldata
  setTimeout(() => {
    console.log('📦 Lägger till testprodukter...');
    insertSampleProducts();
    
    // Tillfälligt inaktiverad för att undvika foreign key problem
    // Kan aktiveras när produktinfogningen är säker
    // insertSampleOrder();
  }, 1000);
};

// ============================================================================
// EXPORTERA FUNKTIONER
// ============================================================================

// Exportera huvudinitialiseringsfunktionen för användning i app.js
module.exports = { initDatabase };