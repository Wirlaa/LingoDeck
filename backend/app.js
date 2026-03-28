/**
 * This is the starting point of the application, it is very barebones and simple right now.
 * Check routes for more details for the mounted GETs and POSTs, the route is api/[route]
 * To check GET: http://localhost:PORT/api/hello
 * To see a returned JSON file: http://localhost:PORT/api/status
 * To check POST: curl.exe -X POST http://localhost:3000/echo (use Powershell or terminal)
 * 
 */

const express = require('express');
const config = require('./src/config/config');
const routes = require('./src/routes/routes');

const app = express();

// Parse JSON bodies so /api/echo can read req.body
app.use(express.json());

const port = config.port;

// Mount all routes defined in src/routes/routes.js under /api
app.use('/api', routes);

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);  
});
