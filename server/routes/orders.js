const express = require('express');
const router = express.Router();
const db = require('../models/database');

// Generera unikt ordernummer
function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}${random}`;
}

// GET /api/orders - Hämta alla ordrar
router.get('/', (req, res) => {
  const sql = `
    SELECT o.*, 
           GROUP_CONCAT(oi.product_name || ' x' || oi.quantity, ', ') as items_summary
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `;
  
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

// GET /api/orders/:id - Hämta en specifik order med items
router.get('/:id', (req, res) => {
  const orderId = req.params.id;
  
  // Hämta order info
  const orderSql = 'SELECT * FROM orders WHERE id = ?';
  db.get(orderSql, [orderId], (err, order) => {
    if (err) {
      console.error('❌ Fel vid hämtning av order:', err.message);
      res.status(500).json({ error: 'Serverfel' });
      return;
    }
    
    if (!order) {
      res.status(404).json({ error: 'Order hittades inte' });
      return;
    }
    
    // Hämta order items
    const itemsSql = 'SELECT * FROM order_items WHERE order_id = ?';
    db.all(itemsSql, [orderId], (err, items) => {
      if (err) {
        console.error('❌ Fel vid hämtning av order items:', err.message);
        res.status(500).json({ error: 'Serverfel' });
        return;
      }
      
      order.items = items;
      console.log('✅ Hämtade order med', items.length, 'items');
      res.json(order);
    });
  });
});

// POST /api/orders - Skapa ny order
router.post('/', (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    billing_address,
    payment_method,
    items
  } = req.body;
  
  // Validering
  if (!customer_name || !customer_email || !shipping_address || !items || items.length === 0) {
    return res.status(400).json({ 
      error: 'Namn, email, adress och produkter krävs' 
    });
  }
  
  // Beräkna totalsumma
  const total_amount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const order_number = generateOrderNumber();
  
  // Skapa order
  const orderSql = `
    INSERT INTO orders 
    (order_number, customer_name, customer_email, customer_phone, shipping_address, billing_address, total_amount, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `;
  
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
    
    const orderId = this.lastID;
    console.log('✅ Order skapad med ID:', orderId);
    
    // Lägg till order items
    const itemsSql = `
      INSERT INTO order_items 
      (order_id, product_id, product_name, product_brand, price, quantity, subtotal)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    let itemsProcessed = 0;
    let hasError = false;
    
    items.forEach(item => {
      const subtotal = item.price * item.quantity;
      
      db.run(itemsSql, [
        orderId,
        item.id,
        item.name,
        item.brand,
        item.price,
        item.quantity,
        subtotal
      ], (err) => {
        if (err && !hasError) {
          hasError = true;
          console.error('❌ Fel vid tillägg av order item:', err.message);
          res.status(500).json({ error: 'Kunde inte lägga till produkter' });
          return;
        }
        
        itemsProcessed++;
        if (itemsProcessed === items.length && !hasError) {
          // Uppdatera order status till completed
          db.run('UPDATE orders SET status = "completed" WHERE id = ?', [orderId], (err) => {
            if (err) {
              console.error('❌ Fel vid uppdatering av order status:', err.message);
            }
            
            res.status(201).json({
              success: true,
              order_id: orderId,
              order_number: order_number,
              total_amount: total_amount,
              message: 'Order skapad framgångsrikt'
            });
            console.log('✅ Order slutförd:', order_number);
          });
        }
      });
    });
  });
});

// PUT /api/orders/:id/status - Uppdatera order status
router.put('/:id/status', (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;
  
  const validStatuses = ['pending', 'completed', 'cancelled', 'shipped'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Ogiltig status' });
  }
  
  const sql = 'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
  
  db.run(sql, [status, orderId], function(err) {
    if (err) {
      console.error('❌ Fel vid uppdatering av order status:', err.message);
      res.status(500).json({ error: 'Kunde inte uppdatera order' });
    } else if (this.changes === 0) {
      res.status(404).json({ error: 'Order hittades inte' });
    } else {
      console.log('✅ Order status uppdaterad:', orderId, 'till', status);
      res.json({ 
        success: true, 
        message: `Order status uppdaterad till ${status}` 
      });
    }
  });
});

module.exports = router; 