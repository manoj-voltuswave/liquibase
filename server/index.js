require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const express = require('express');
const swaggerUi = require('swagger-ui-express');
const db = require('./utils/db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const spec = require('./openapi.json');

app.use(express.json());

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
  swaggerOptions: { docExpansion: 'list' },
}));

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Express server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/db-status', async (req, res) => {
  const schema = req.query.schema || null;
  const result = await db.ping(schema || undefined);
  res.json({ schema, ...result });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});

process.on('SIGTERM', async () => {
  await db.close();
  server.close();
});
