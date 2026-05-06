
const app = require('./src/app');
const { testConnection, executeQuery } = require('./src/config/database');
const { unhandledRejectionHandler, uncaughtExceptionHandler } = require('./src/middleware/errorHandler');

const PORT = process.env.PORT || 5000;

// ==============================================
// Scheduled Tasks
// ==============================================

// Clean up expired OTP tokens every hour
const cleanupExpiredOTPTokens = async () => {
  try {
    const result = await executeQuery(
      `DELETE FROM otp_tokens WHERE expires_at < NOW() OR (used = TRUE AND created_at < DATE_SUB(NOW(), INTERVAL 1 DAY))`
    );
    if (result.affectedRows > 0) {
      console.log(`🧹 Cleaned up ${result.affectedRows} expired OTP tokens`);
    }
  } catch (error) {
    console.error('❌ Failed to cleanup OTP tokens:', error.message);
  }
};

// Start scheduled tasks
const startScheduledTasks = () => {
  // Run cleanup immediately on startup
  cleanupExpiredOTPTokens();

  // Then run every hour (3600000 ms)
  setInterval(cleanupExpiredOTPTokens, 60 * 60 * 1000);

  console.log('⏰ Scheduled tasks started (OTP cleanup: hourly)');
};

// ==============================================
// Setup Process-Level Error Handlers
// ==============================================
uncaughtExceptionHandler();
unhandledRejectionHandler();

// Test database connection before starting server
const startServer = async () => {
  try {
    // Test database connection
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your database configuration.');
      process.exit(1);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 HRMS Backend Server Started`);
      console.log(`📡 Port: ${PORT}`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📝 API Base: ${process.env.API_PREFIX || '/api/v1'}`);
      console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
      console.log('='.repeat(50) + '\n');

      // Start scheduled tasks
      startScheduledTasks();
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Note: Process-level error handlers are now set up at the top of this file

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n📌 SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n📌 SIGINT received. Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

