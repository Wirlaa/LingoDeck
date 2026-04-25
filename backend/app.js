const express = require('express');
const client = require('prom-client');
const config = require('./src/config/config');
const routes = require('./src/routes/routes');
const { routeCors } = require('./src/middleware/cors');
const swaggerUi = require('swagger-ui-express');
const openapiDoc = require('./docs/openapi.json');

const app = express();

// ── Prometheus metrics setup ──────────────────────────────────────────────────
// Collect default Node.js metrics (CPU, memory, event loop lag, etc.)
const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "auth_backend_" });

// Parse JSON bodies so /api/echo can read req.body
app.use(express.json());
// Use CORS globally
app.use(routeCors);

// Swagger UI
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get('/docs.json', (_req, res) => res.json(openapiDoc));
app.get('/', (_req, res) => {
  res.redirect('/docs');
});

const port = config.port;

// Mount all routes defined in src/routes/routes.js under /api
app.use('/api', routes);

// ── Prometheus /metrics endpoint ──────────────────────────────────────────────
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
