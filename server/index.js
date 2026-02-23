const express = require('express');
const swaggerUi = require('swagger-ui-express');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

const spec = require('./openapi.json');

app.use(express.json());

// Swagger UI at /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec, {
  swaggerOptions: { docExpansion: 'list' },
}));

app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Express server is running' });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
