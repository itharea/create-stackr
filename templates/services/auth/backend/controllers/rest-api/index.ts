import { buildServer } from "./server";

const start = async () => {
  const server = await buildServer();
  try {
    const host = server.config.API_HOST || '0.0.0.0';
    const port = parseInt(server.config.API_PORT || '8080');

    await server.listen({
      host,
      port,
    });

    console.log(`🚀 Server is running at http://${host}:${port}`);
    console.log(`📚 API Documentation available at http://${host}:${port}/documentation (if enabled)`);
  } catch (error) {
    server.log.error(error);
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }

  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, gracefully shutting down...');
    try {
      await server.close();
      console.log('✅ Server closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, gracefully shutting down...');
    try {
      await server.close();
      console.log('✅ Server closed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
};

start();
