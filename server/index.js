require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

const app = express();
connectDB();

const isProd = process.env.NODE_ENV === 'production';

app.use(cors(
  isProd
    ? { origin: process.env.CLIENT_ORIGIN || true, credentials: true }
    : { origin: ['http://localhost:5173', 'http://localhost:3000'], credentials: true }
));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/masters', require('./routes/masters'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/jobcards', require('./routes/jobcards'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/estimates', require('./routes/estimates'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/purchase-orders', require('./routes/purchaseOrders'));
app.use('/api/ledger',          require('./routes/ledger.routes'));
app.use('/api/party',           require('./routes/party.routes'));
app.use('/api/vehicle-sales',   require('./routes/vehicleSale.routes'));
app.use('/api/vehicle-stock',   require('./routes/vehicleStock.routes'));
app.use('/api/counter-sales',   require('./routes/counterSales'));
app.use('/api/cashbook',        require('./routes/cashbook'));
app.use('/api/expenses',        require('./routes/expenses'));
app.use('/api/appointments',    require('./routes/appointments'));
app.use('/api/reports',         require('./routes/reports'));
app.use('/api/staff',           require('./routes/staff'));
app.use('/api/superadmin',      require('./routes/superadmin'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date() }));

// Serve React frontend when built (production)
const clientDist = path.join(__dirname, '../client/dist');
if (require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
