import Fastify from 'fastify';
import cors from '@fastify/cors';
import diagramRoutes from './routes/diagrams';

const app = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

const start = async () => {
  await app.register(cors, {
    origin: true,
  });

  await app.register(diagramRoutes, { prefix: '/api/diagrams' });

  const port = Number(process.env.PORT) || 3001;

  try {
    await app.listen({ port, host: '0.0.0.0' });
    console.log(`Backend listening on port ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
