// src/server.js
require('dotenv').config();
const http = require('http');
const app = require('./app');
const db = require('./config/db.config');

const PORT = process.env.PORT || 8080;

// Test MySQL connection and start server
(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Connected to MySQL');
    connection.release();

    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection:', err.message);
      server.close(() => process.exit(1));
    });

  } catch (err) {
    console.error('❌ Unable to connect to MySQL:', err.message);
    process.exit(1);
  }
})();
