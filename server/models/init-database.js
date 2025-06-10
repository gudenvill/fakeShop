const db = require('./database');

// Skapa produkttabell
const createProductsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(100) NOT NULL,
      brand VARCHAR(50) NOT NULL,
      description TEXT,
      price DECIMAL(10,2) NOT NULL,
      sku VARCHAR(20) UNIQUE NOT NULL,
      image_url VARCHAR(255),
      category VARCHAR(50),
      stock_quantity INTEGER DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Fel vid skapande av produkttabell:', err.message);
    } else {
      console.log('✅ Produkttabell skapad/verifierad');
    }
  });
};

// Skapa ordertabell
const createOrdersTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number VARCHAR(20) UNIQUE NOT NULL,
      customer_name VARCHAR(100) NOT NULL,
      customer_email VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20),
      shipping_address TEXT NOT NULL,
      billing_address TEXT,
      total_amount DECIMAL(10,2) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending',
      payment_method VARCHAR(50),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Fel vid skapande av ordertabell:', err.message);
    } else {
      console.log('✅ Ordertabell skapad/verifierad');
    }
  });
};

// Skapa order_items tabell
const createOrderItemsTable = () => {
  const sql = `
    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name VARCHAR(100) NOT NULL,
      product_brand VARCHAR(50) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      quantity INTEGER NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders (id),
      FOREIGN KEY (product_id) REFERENCES products (id)
    )
  `;

  db.run(sql, (err) => {
    if (err) {
      console.error('❌ Fel vid skapande av order_items tabell:', err.message);
    } else {
      console.log('✅ Order_items tabell skapad/verifierad');
    }
  });
};

// Lägg till exempeldata med specifika datum
const insertSampleProducts = () => {
  // Skapa datum för olika åldrar
  const now = new Date();
  
  // Nya produkter (senaste 3 dagarna)
  const newDate1 = new Date(now);
  newDate1.setDate(now.getDate() - 1); // 1 dag sedan
  
  const newDate2 = new Date(now);
  newDate2.setDate(now.getDate() - 2); // 2 dagar sedan
  
  const newDate3 = new Date(now);
  newDate3.setDate(now.getDate() - 3); // 3 dagar sedan
  
  // Gamla produkter (mer än 7 dagar sedan)
  const oldDate1 = new Date(now);
  oldDate1.setDate(now.getDate() - 10); // 10 dagar sedan
  
  const oldDate2 = new Date(now);
  oldDate2.setDate(now.getDate() - 15); // 15 dagar sedan
  
  const oldDate3 = new Date(now);
  oldDate3.setDate(now.getDate() - 20); // 20 dagar sedan

  const products = [
    // Nya produkter (kommer visa "Nyhet")
    {
      name: 'Premium T-shirt',
      brand: 'Levis',
      description: 'Premium kvalitet t-shirt i mjuk bomull',
      price: 249.00,
      sku: 'AAA111',
      image_url: '/images/product.png',
      category: 'tshirts',
      stock_quantity: 50,
      created_at: newDate1.toISOString().slice(0, 19).replace('T', ' ')
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
    
    // Gamla produkter (kommer INTE visa "Nyhet")
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

  // Använd INSERT OR REPLACE för att undvika dubbletter
  const sql = `
    INSERT OR REPLACE INTO products 
    (name, brand, description, price, sku, image_url, category, stock_quantity, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  let productsProcessed = 0;
  
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
      product.created_at
    ], (err) => {
      if (err) {
        console.error('❌ Fel vid infogning av produkt:', err.message);
      } else {
        console.log('✅ Exempelprodukt infogad:', product.name);
      }
      
      productsProcessed++;
      if (productsProcessed === products.length) {
        console.log('✅ Alla produkter infogade');
      }
    });
  });
};

// Lägg till exempel-order för testning
const insertSampleOrder = () => {
  setTimeout(() => {
    // Först hämta faktiska produkt-IDs från databasen
    db.all('SELECT id, name, brand, price FROM products WHERE sku IN ("AAA111", "BBB111") ORDER BY sku', [], (err, products) => {
      if (err || products.length < 2) {
        console.log('⚠️ Kunde inte skapa exempel-order - produkter hittades inte');
        console.log('Hittade produkter:', products);
        return;
      }
      
      const orderSql = `
        INSERT OR REPLACE INTO orders 
        (order_number, customer_name, customer_email, customer_phone, shipping_address, total_amount, status, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const totalAmount = (products[0].price * 2) + (products[1].price * 1);
      
      db.run(orderSql, [
        'ORD-001',
        'Anna Andersson',
        'anna@example.com',
        '070-123 45 67',
        'Storgatan 1, 123 45 Stockholm',
        totalAmount,
        'completed',
        'card'
      ], function(err) {
        if (err) {
          console.error('❌ Fel vid infogning av exempel-order:', err.message);
        } else {
          console.log('✅ Exempel-order infogad med ID:', this.lastID);
          
          // Lägg till order items med faktiska produkt-data
          const itemsSql = `
            INSERT OR REPLACE INTO order_items 
            (order_id, product_id, product_name, product_brand, price, quantity, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `;
          
          // Lägg till första produkten
          db.run(itemsSql, [
            this.lastID, 
            products[0].id, 
            products[0].name, 
            products[0].brand, 
            products[0].price, 
            2, 
            products[0].price * 2
          ], (err) => {
            if (err) {
              console.error('❌ Fel vid tillägg av order item 1:', err.message);
            } else {
              console.log('✅ Order item 1 infogad');
            }
          });
          
          // Lägg till andra produkten
          db.run(itemsSql, [
            this.lastID, 
            products[1].id, 
            products[1].name, 
            products[1].brand, 
            products[1].price, 
            1, 
            products[1].price * 1
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
  }, 3000); // Öka timeout ytterligare
};

// Initiera databas
const initDatabase = () => {
  createProductsTable();
  createOrdersTable();
  createOrderItemsTable();
  
  // Vänta lite för att tabellerna ska skapas, sedan lägg till exempeldata
  setTimeout(() => {
    insertSampleProducts();
    // Tillfälligt inaktiverad för att undvika foreign key problem
    // insertSampleOrder();
  }, 1000);
};

module.exports = { initDatabase };