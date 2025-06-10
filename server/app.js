// Importera önskade förpackningar
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const { initDatabase } = require('./models/init-database');

// Importera routes
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');

// Skapa Express app
const app = express()
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servera statiska filer från public directory
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// Route att testa
app.get('/api/test', (req, res) => {
    res.json({ message: 'Backend är igång!' });
});

// Servera main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Initiera databas när servern startar
initDatabase();

// Starta servern
app.listen(PORT, () => {
    console.log(`🚀 FakeShop server är igång på http://localhost:${PORT}`);
    console.log(`📁 Serverar statiska filer från: ${path.join(__dirname, '../public')}`);
});