const express = require('express');
const router = express.Router();
const db = require('../models/database');

// GET /api/products - Hämta alla produkter
router.get('/', (req, res) => {
    const sql = 'SELECT * FROM products WHERE is_active = 1 ORDER BY created_at DESC';

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('❌ Fel vid hämtning av produkter:', err.message);
            res.status(500).json({ error: 'Serverfel vid hämtning av produkter' });
        } else {
            console.log('✅ Hämtade', rows.length, 'produkter från databasen');
            res.json(rows);
        }
    });
});

// GET /api/products/search/:query - Sök produkter efter namn
router.get('/search/:query', (req, res) => {
  const searchQuery = req.params.query;
  const sql = `
    SELECT * FROM products 
    WHERE is_active = 1 
    AND (name LIKE ? OR brand LIKE ? OR description LIKE ?)
    ORDER BY created_at DESC
  `;
  
  const searchPattern = `%${searchQuery}%`;
  
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

// GET /api/products/:id - Hämta en specifik produkt
router.get('/:id', (req, res) => {
    const sql = 'SELECT * FROM products WHERE id = ? AND is_active = 1';
    const productId = req.params.id;

    db.get(sql, [productId], (err, row) => {
        if (err) {
            console.error('❌ Fel vid hämtning av produkt:', err.message);
            res.status(500).json({ error: 'Serverfel vid hämtning av produkt' });
        } else if (row) {
            console.log('✅ Hämtade produkt:', row.name);
            res.json(row);
        } else {
            res.status(404).json({ error: 'Produkten hittades inte' });
        }
    });
});

// POST /api/products - Skapa ny produkt
router.post('/', (req, res) => {
    const { name, brand, description, price, sku, image_url, category, stock_quantity } = req.body;

    // Validera obligatoriska fält
    if (!name || !brand || !price || !sku) {
        return res.status(400).json({ error: 'Namn, märke, pris och SKU är obligatoriska' });
    }

    const sql = `
      INSERT INTO products (name, brand, description, price, sku, image_url, category, stock_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.run(sql, [name, brand, description, price, sku, image_url, category, stock_quantity || 0], function (err) {
        if (err) {
            console.error('❌ Fel vid skapande av produkt:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'SKU finns redan' });
            } else {
                res.status(500).json({ error: 'Serverfel vid skapande av produkt' });
            }
        } else {
            console.log('✅ Ny produkt skapad med ID:', this.lastID);
            res.status(201).json({
                id: this.lastID,
                message: 'Produkt skapad framgångsrikt',
                product: { id: this.lastID, name, brand, price, sku }
            });
        }
    });
});

// PUT /api/products/:id - Uppdatera produkt
router.put('/:id', (req, res) => {
    const productId = req.params.id;
    const { name, brand, description, price, sku, image_url, category, stock_quantity, is_active } = req.body;

    const sql = `
      UPDATE products 
      SET name = ?, brand = ?, description = ?, price = ?, sku = ?, 
          image_url = ?, category = ?, stock_quantity = ?, is_active = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    db.run(sql, [name, brand, description, price, sku, image_url, category, stock_quantity, is_active, productId], function (err) {
        if (err) {
            console.error('❌ Fel vid uppdatering av produkt:', err.message);
            if (err.message.includes('UNIQUE constraint failed')) {
                res.status(400).json({ error: 'SKU finns redan' });
            } else {
                res.status(500).json({ error: 'Serverfel vid uppdatering av produkt' });
            }
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Produkten hittades inte' });
        } else {
            console.log('✅ Produkt uppdaterad, ID:', productId);
            res.json({ message: 'Produkt uppdaterad framgångsrikt' });
        }
    });
});


// DELETE /api/products/:id - Ta bort produkt (soft delete)
router.delete('/:id', (req, res) => {
    const productId = req.params.id;

    // Soft delete - sätt is_active till 0 istället för att ta bort helt
    const sql = 'UPDATE products SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?';

    db.run(sql, [productId], function (err) {
        if (err) {
            console.error('❌ Fel vid borttagning av produkt:', err.message);
            res.status(500).json({ error: 'Serverfel vid borttagning av produkt' });
        } else if (this.changes === 0) {
            res.status(404).json({ error: 'Produkten hittades inte' });
        } else {
            console.log('✅ Produkt borttagen (inaktiverad), ID:', productId);
            res.json({ message: 'Produkt borttagen framgångsrikt' });
        }
    });
});


// GET /api/products/category/:category - Hämta produkter per kategori
router.get('/category/:category', (req, res) => {
    const category = req.params.category;
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

module.exports = router;