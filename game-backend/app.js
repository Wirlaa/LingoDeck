const express = require("express");
const client = require("prom-client");
const config = require("./src/config/config");
const routes = require("./src/routes");
const { routeCors } = require("./src/middleware/cors");
const swaggerUi = require("swagger-ui-express");
const openapiDoc = require("./src/docs/openapi.json");

const app = express();

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics({ prefix: "game_backend_" });

app.use(express.json());
app.use(routeCors);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get("/docs.json", (_req, res) => res.json(openapiDoc));
app.get("/", (_req, res) => { res.redirect("/docs"); });

app.use("/api", routes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "game-backend" });
});

app.get("/metrics", async (_req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

app.listen(config.port, () => {
  console.log(`Game backend listening on port ${config.port}`);
});
