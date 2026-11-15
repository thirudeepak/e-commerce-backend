'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const app = require('./app');
const logger = require('./config/logger');

// Trigger model registration so Sequelize knows all models before sync
require('./models');

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    // Connect to DB and sync models
    const server = app.listen(PORT, () => {
      logger.info(
        `Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`
      );
    });

    server.on('error', (err) => {
      logger.error('Server listen error:', err);
    });
  } catch (error) {
    logger.error('Failed to start the server:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections without crashing the entire service in dev
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection detected:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception detected:', error);
});

startServer();
