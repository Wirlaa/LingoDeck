const express = require("express");
const config = require("./src/config/config");
const routes = require("./src/routes");
const { routeCors } = require("./src/middleware/cors");
const swaggerUi = require("swagger-ui-express");
const openapiDoc = require("./src/docs/openapi.json");

const app = express();

// JSON body parsing
app.use(express.json());

// Use same CORS middleware as auth backend
app.use(routeCors);

// Swagger UI + raw JSON
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDoc));
app.get("/docs.json", (_req, res) => res.json(openapiDoc));

// Optional: redirect root to docs
app.get("/", (_req, res) => {
  res.redirect("/docs");
});

// Mount all game routes under /api
app.use("/api", routes);

// Simple health endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "game-backend" });
});

app.listen(config.port, () => {
  console.log(`Game backend listening on port ${config.port}`);
});