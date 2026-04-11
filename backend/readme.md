
Skip to content

    Wirlaa
    LingoDeck

Repository navigation

    Code
    Issues6 (6)
    Pull requests2 (2)
    Agents
    Actions
    Projects
    Wiki
    Security and quality
    Insights
    Settings

Commit a5375c9
Rh2001
Rh2001
authored
last week
Backend -> Simple CORS, Postgre SQL Docker and simple POST and GET request to the database. (#21)
<h2>Brief Description</h2>
<p>This project improves and builds upon the backend skeleton we had already established.</p>
<p><strong>Key Changes:</strong></p>
<ul>
    <li>Added a dockerized PostgreSQL setup.</li>
    <li>Simple CORS implementation (to be improved later).</li>
    <li>GET and POST endpoints connected to the database.</li>
    <li>Added JWT authentication.</li>
    <li>Added Bcrypt password hashing to avoid storing plain passwords.</li>
    <li>Added Authorization header support using Bearer tokens.</li>
</ul>
<hr>
<h2>Setup</h2>
<h3>Prerequisites</h3>
<ul>
    <li>Node.js and npm</li>
    <li>Docker + Docker Compose</li>
</ul>
<h3>Steps</h3>
<ol>
    <li><strong>Clone and install dependencies</strong></li>
</ol>
<pre><code class="language-bash">git clone https://github.com/Wirlaa/LingoDeck.git
cd backend
npm install
</code></pre>
<ol start="2">
    <li><strong>Create or check <code>.env</code> in the backend folder</strong></li>
</ol>
<pre><code class="language-env">PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5433
DB_USER=user
DB_PASSWORD=password
DB_NAME=projectdb
SALT_ROUNDS=10
JWT_SECRET=superdupersecret_dev_key_I_am_not_cookinghere_please_remove_me
JWT_EXPIRATION=30m
</code></pre>
<ol start="3">
    <li><strong>Start PostgreSQL with Docker</strong></li>
</ol>
<pre><code class="language-bash">cd backend
docker compose up db
</code></pre>
<p><em>Optional:</em> If using VS Code, install the Docker Compose extension and right-click to start. This starts Postgres on <code>localhost:5433</code> and initializes the <code>users</code> table with sample data from <code>init.sql</code>.</p>
<ol start="4">
    <li><strong>Start the backend API</strong></li>
</ol>
<pre><code class="language-bash">cd backend
npm run dev
</code></pre>
<p>The server listens on <a href="http://localhost:3000">http://localhost:3000</a> and mounts routes under <code>/api</code>.</p>
<hr>
<h2>Testing Features</h2>
<p>All test scripts are in <code>backend/tests/</code>. Run them from the <code>backend/</code> folder using Node.js.</p>
<p><strong>Note:</strong> <code>test-db.js</code> has not been updated and still retrieves <code>first name</code> and <code>last name</code>. Use other test files instead.</p>
<h3>1. Test User API: <code>tests/test-db-users.js</code></h3>
<p><strong>Purpose:</strong></p>
<ul>
    <li>Calls API via HTTP (no direct DB access)</li>
    <li>Verifies custom Response wrapper fields</li>
</ul>
<p><strong>Steps:</strong></p>
<ol>
    <li>GET /api/users/1</li>
    <li>POST /api/users with a unique username/email</li>
    <li>GET /api/users/{newUser.id}</li>
</ol>
<p><strong>Run:</strong></p>
<pre><code class="language-bash"># Terminal 1
cd backend
npm run dev

# Terminal 2
cd backend
node tests/test-db-users.js
</code></pre>
<hr>
<h3>2. Test CORS: <code>tests/test-cors.js</code></h3>
<p><strong>Purpose:</strong></p>
<ul>
    <li>Sends GET /api/hello with different Origin headers</li>
    <li>Verifies Access-Control-Allow-Origin based on <code>cors.js</code> config</li>
    <li>Sample implementation; full CORS support to be added later</li>
</ul>
<p><strong>Run:</strong></p>
<pre><code class="language-bash"># Terminal 1
cd backend
npm run dev

# Terminal 2
cd backend
node tests/test-cors.js
</code></pre>
<hr>
<h2>Design Decisions</h2>
<ul>
    <li>No ORM yet — raw SQL is used (can be added later)</li>
    <li>Schema is defined in <code>init.sql</code> (future improvements planned)</li>
    <li>Components separated into folders for better project management</li>
    <li>Dedicated test folder for simpler testing</li>
    <li>Custom Data Transfer Object for standardized API responses:
        <ul>
            <li><strong>status:</strong> success or failure</li>
            <li><strong>code:</strong> mirrors HTTP status</li>
            <li><strong>message:</strong> human-readable</li>
            <li><strong>data:</strong> actual user object</li>
        </ul>
    </li>
    <li><strong>JWT Token</strong> for authentication</li>
    <li><strong>Bcrypt password hashing</strong> to avoid saving plain passwords</li>
    <li><strong>Authorization</strong> using: 'Authorization': `Bearer ${token}`</li>
</ul>
<hr>
<h2>Expected Endpoint Response</h2>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "User fetched successfully",
  "data": {
    "id": 1,
    "username": "john_doe",
    "email": "john.doe@example.com",
    "created_at": "...",
    "updated_at": "..."
  }
}
</code></pre>
<hr>
<h2>All Endpoints (Updated)</h2>
<table border="1" cellspacing="0" cellpadding="5">
<tr><th>Method</th><th>Endpoint</th><th>Description</th><th>Auth Required</th></tr>
<tr><td>GET</td><td>/api/hello</td><td>Simple text response</td><td>❌ No</td></tr>
<tr><td>GET</td><td>/api/status</td><td>Health/status check</td><td>❌ No</td></tr>
<tr><td>POST</td><td>/api/echo</td><td>Echo JSON payload</td><td>❌ No</td></tr>
<tr><td>POST</td><td>/api/users</td><td>Register new user</td><td>❌ No</td></tr>
<tr><td>POST</td><td>/api/login</td><td>Authenticate user & get JWT</td><td>❌ No</td></tr>
<tr><td>GET</td><td>/api/users/:id</td><td>Get user by ID</td><td>✅ Yes</td></tr>
<tr><td>GET</td><td>/api/token-status</td><td>Check JWT validity/expiration</td><td>✅ Yes</td></tr>
</table>
<hr>
<h2>Project Structure</h2>
<pre><code class="language-bash">backend/
├── database/
│   └── init.sql
├── node_modules/
├── src/
│   ├── config/
│   │   └── config.js
│   ├── controllers/
│   │   └── userController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── cors.js
│   ├── models/
│   │   └── userModel.js
│   ├── routes/
│   │   └── routes.js
│   └── utilities/
│       ├── authHeader.js
│       ├── database.js
│       ├── jwt.js
│       ├── password.js
│       └── response.js
├── tests/
│   ├── test-cors.js
│   ├── test-db-users.js
│   └── test-db.js
├── .env
├── app.js
└── docker-compose.yml
</code></pre>
<hr>
<h1>Backend API Documentation</h1>
<h2>Backend API Reference</h2>
<h3>Base URL (development)</h3>
<pre><code>http://localhost:3000/api</code></pre>
<hr>
<h2>Response Format</h2>
<p>All JSON responses from the backend are wrapped in this structure:</p>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "Human-readable message here",
  "data": { "...": "..." }
}
</code></pre>
<ul>
    <li>status: true on success, false on error</li>
    <li>code: HTTP status code mirrored in the JSON</li>
    <li>message: short description</li>
    <li>data: payload object on success, or null on errors</li>
</ul>
<hr>
<h2>1. Register User – POST /api/users</h2>
<p>Create a new user account.</p>
<h3>Request</h3>
<pre><code class="language-http">POST /api/users HTTP/1.1
Host: localhost:3000
Content-Type: application/json
</code></pre>
<h3>Body</h3>
<pre><code class="language-json">{
  "username": "some_username",
  "email": "user@example.com",
  "password": "plain_password_here"
}
</code></pre>
<h3>Successful Response (201)</h3>
<pre><code class="language-json">{
  "status": true,
  "code": 201,
  "message": "User created successfully",
  "data": {
    "id": 7,
    "username": "some_username",
    "email": "user@example.com",
    "created_at": "2026-03-31T10:00:00.000Z",
    "updated_at": "2026-03-31T10:00:00.000Z"
  }
}
</code></pre>
<h3>Validation Error (400)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 400,
  "message": "username, email and password fields are required fields",
  "data": null
}
</code></pre>
<h3>Conflict (409)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 409,
  "message": "Username or email already exists in the database",
  "data": null
}
</code></pre>
<hr>
<h2>2. Login – POST /api/login</h2>
<p>Authenticate an existing user and receive a JWT.</p>
<h3>Request</h3>
<pre><code class="language-http">POST /api/login HTTP/1.1
Host: localhost:3000
Content-Type: application/json
</code></pre>
<h3>Body</h3>
<pre><code class="language-json">{
  "email": "user@example.com",
  "password": "plain_password_here"
}
</code></pre>
<h3>Successful Response (200)</h3>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 7,
      "username": "some_username",
      "email": "user@example.com",
      "created_at": "2026-03-31T10:00:00.000Z",
      "updated_at": "2026-03-31T10:00:00.000Z"
    },
    "jwToken": "&lt;JWT_TOKEN_STRING&gt;"
  }
}
</code></pre>
<h3>Authorization Header</h3>
<pre><code>Authorization: Bearer &lt;JWT_TOKEN&gt</code></pre>
<h3> Example for Header with Axios <h3>
<pre><code> const authApi = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const userRes = await authApi.get(`/users/${userId}`); </code></pre>
<h3>User Not Found (401)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 401,
  "message": "User not found",
  "data": null
}
</code></pre>
<h3>Wrong Password (401)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 401,
  "message": "Invalid user credentials",
  "data": null
}
</code></pre>
<hr>
<h2>3. Get User (Protected) – GET /api/users/:id</h2>
<p>Fetch user details by ID. Requires a valid JWT.</p>
<h3>Request</h3>
<pre><code class="language-http">GET /api/users/7 HTTP/1.1
Host: localhost:3000
Authorization: Bearer &lt;JWT_TOKEN_STRING&gt;</code></pre>
<h3>Successful Response (200)</h3>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "User fetched successfully",
  "data": {
    "id": 7,
    "username": "some_username",
    "email": "user@example.com",
    "created_at": "2026-03-31T10:00:00.000Z",
    "updated_at": "2026-03-31T10:00:00.000Z"
  }
}
</code></pre>
<h3>User Not Found (404)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 404,
  "message": "User not found",
  "data": null
}
</code></pre>
<h3>Invalid ID (400)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 400,
  "message": "Invalid User Id",
  "data": null
}
</code></pre>
<h3>Auth Errors (401)</h3>
<pre><code class="language-json">{
  "status": false,
  "code": 401,
  "message": "Authorization header is missing or incorrect",
  "data": null
}
</code></pre>
<pre><code class="language-json">{
  "status": false,
  "code": 401,
  "message": "Token expired",
  "data": null
}
</code></pre>
<pre><code class="language-json">{
  "status": false,
  "code": 401,
  "message": "Invalid token",
  "data": null
}
</code></pre>
<hr>
<h2>4. Token Status – GET /api/token-status</h2>
<p>Check whether a JWT is valid, expired, or invalid.</p>
<h3>Request</h3>
<pre><code class="language-http">GET /api/token-status HTTP/1.1
Host: localhost:3000
Authorization: Bearer &lt;JWT_TOKEN_STRING&gt;</code></pre>
<h3>Token Valid (200)</h3>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "Token is valid",
  "data": {
    "valid": true,
    "expired": false,
    "user": {
      "id": 7,
      "username": "some_username",
      "email": "user@example.com",
      "iat": 1711870000,
      "exp": 1711871800
    }
  }
}
</code></pre>
<h3>Token Expired (200)</h3>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "Token has expired",
  "data": {
    "valid": false,
    "expired": true,
    "user": null
  }
}
</code></pre>
<h3>Token Invalid (200)</h3>
<pre><code class="language-json">{
  "status": true,
  "code": 200,
  "message": "Token is invalid",
  "data": {
    "valid": false,
    "expired": false,
    "user": null
  }
}
</code></pre>
</body>
</html>
main(#21)

1 parent 
0bc47ca
 commit 
a5375c9

File tree

    backend
        app.js
        database
            init.sql
        docker-compose.yml
        package-lock.json
        package.json
        src
            config
                config.js
            controllers
                userController.js
            middleware
                auth.js
                cors.js
            models
                userModel.js
            routes
                routes.js
            utilities
                authHeader.js
                database.js
                jwt.js
                password.js
                response.js
        tests
            test-cors.js
            test-db-users.js
            test-db.js

19 files changed
+1175
-6
lines changed
 
‎backend/app.js‎
+3Lines changed: 3 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -10,11 +10,14 @@
const express = require('express');
const config = require('./src/config/config');
const routes = require('./src/routes/routes');
const {routeCors} = require('./src/middleware/cors');

const app = express();

// Parse JSON bodies so /api/echo can read req.body
app.use(express.json());
// Use CORS globally
app.use(routeCors);

const port = config.port;

‎backend/database/init.sql‎
+21Lines changed: 21 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,21 @@
-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
-- Create index on commonly searched fields
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
-- Insert sample data
INSERT INTO users (username, email, password_hash)
VALUES
    ('john_doe', 'john.doe@example.com', 'hashed_password_1'),
    ('jane_smith', 'jane.smith@example.com', 'hashed_password_2'),
    ('bob_johnson', 'bob.johnson@example.com', 'hashed_password_3');
‎backend/docker-compose.yml‎
+30Lines changed: 30 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,30 @@
services:
  db:
    image: postgres:17.4
    container_name: postgres_db
    restart: always
    environment:
      TZ: Europe/Helsinki
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: projectdb
    ports:
      - "5433:5432"   # required since backend runs on host for now
    volumes:
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
      - ./db_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d projectdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - cloud_project
networks:
  cloud_project:
‎backend/package-lock.json‎
+306-1Lines changed: 306 additions & 1 deletion
Some generated files are not rendered by default. Learn more about customizing how changed files appear on GitHub.
‎backend/package.json‎
+5-1Lines changed: 5 additions & 1 deletion
Original file line number	Diff line number	Diff line change
@@ -12,8 +12,12 @@
  "license": "ISC",
  "type": "commonjs",
  "dependencies": {
    "bcryptjs": "^3.0.3",
    "cors": "^2.8.6",
    "dotenv": "^17.3.1",
    "express": "^5.2.1",
    "nodemon": "^3.1.14"
    "jsonwebtoken": "^9.0.3",
    "nodemon": "^3.1.14",
    "pg": "^8.20.0"
  }
}
‎backend/src/config/config.js‎
+17-1Lines changed: 17 additions & 1 deletion
Original file line number	Diff line number	Diff line change
@@ -5,11 +5,27 @@ dotenv.config({ override: true });

const config = {
	port: process.env.PORT || 3000,
	nodeEnv: process.env.NODE_ENV || 'development',
	db: {
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT) || 5432,
		user: process.env.DB_USER || 'user',
		password: process.env.DB_PASSWORD || 'password',
		name: process.env.DB_NAME || 'projectdb',
		
	},
	auth: {
		salt_rounds: Number(process.env.SALT_ROUNDS) || 10, // Default to 10 if no SALT_ROUNDS set
		jwtSecret: process.env.JWT_SECRET || 'placeholder_dev_jwt_key',
		jwtExpiration: process.env.JWT_EXPIRATION || '30m' // Expire after 30mins by default.
	}
	
};

console.log('Loaded PORT from env:', process.env.PORT);
console.log('Config port:', config.port);
console.log('DB config: (Delete this for final build, it is in config.js)', config.db);

module.exports = config;

‎backend/src/controllers/userController.js‎
+173Lines changed: 173 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,173 @@
const { getUserById, createUser: createUserModel, getUserByEmail } = require('../models/userModel');
const { comparePassword } = require('../utilities/password');
const { signJWToken, verifyJWToken } = require('../utilities/jwt');
const { extractBearerToken } = require('../utilities/authHeader');
const Response = require('../utilities/response');
// Path: GET /api/users/:id
async function getUser(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res
      .status(400)
      .json(new Response(false, 400, 'Invalid User Id', null));
  }
  try {
    const user = await getUserById(id);
    // If the user does not exist, return a status code 404 error wrapped with the customer response class.
    if (!user) {
      return res
        .status(404)
        .json(new Response(false, 404, 'User not found', null)); // Custom response sent from the backend.
    }
    return res
      .status(200)
      .json(new Response(true, 200, 'User fetched successfully', user));
  } catch (err) {
    console.error('Controller getUser error:', err.message);
    return res
      .status(500)
      .json(new Response(false, 500, 'Failed to fetch user', null));
  }
}
// Path: POST /api/users
async function createUser(req, res) {
  const { username, email, password } = req.body || {};
  if (!username || !email || !password) {
    return res
      .status(400)
      .json(
        new Response(
          false,
          400,
          'username, email and password fields are required fields',
          null
        )
      );
  }
  try {
    const newUser = await createUserModel(
      username,
      email,
      password,
    
    );
    return res
      .status(201)
      .json(new Response(true, 201, 'User created successfully', newUser));
  } catch (err) {
    console.error('Controller createUser error:', err.message);
    if (err.code === '23505') {
      return res
        .status(409)
        .json(
          new Response(false, 409, 'Username or email already exists in the database', null)
        );
    }
    return res
      .status(500)
      .json(new Response(false, 500, 'Failed to create user', null));
  }
}
// Path: POST /api/login
async function login(req,res) {
  const {email, password} = req.body || {};
  if (!email || !password)
    return res
      .status(400)
      .json(
        new Response(false, 400, 'Email and Password are required fields', null)
      );
  
  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return res
        .status(401)
        .json(
          new Response(false, 401, 'User not found', null)
        );
    }
    const passwordOk = await comparePassword(password, user.password_hash);
    if (!passwordOk) {
      return res
        .status(401)
        .json(new Response(false, 401, 'Invalid user credentials', null));
    }
    const { password_hash, ...safeUser } = user;
    const payload = {
      id: user.id,
      username: user.username,
      email: user.email
    };
    const jwToken = signJWToken(payload);
    const responseData = {
      user: safeUser,
      jwToken,
    };
    return res
      .status(200)
      .json(new Response(true, 200, 'Login successful', responseData));
  } catch (err) {
    console.error('Controller login error:', err.message);
    return res
      .status(500)
      .json(new Response(false, 500, 'User login failed', null));
  }
}
// Path: GET /api/token-status
// Checks the JWT status and returns it.
function checkTokenStatus(req, res) {
  const { ok, token, errorMessage } = extractBearerToken(req);
  if (!ok) {
    return res
      .status(400)
      .json(new Response(false, 400, errorMessage, null));
  }
  const { valid, expired, decoded } = verifyJWToken(token);
  const message = valid ? 'Token is valid' : expired ? 'Token has expired' : 'Token is invalid';
  const data = {
    valid,
    expired,
    user: valid ? decoded : null,
  };
  return res
    .status(200)
    .json(new Response(true, 200, message, data));
}
module.exports = {
  getUser,
  createUser,
  login,
  checkTokenStatus
};
‎backend/src/middleware/auth.js‎
+51Lines changed: 51 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,51 @@
/**
 * This module might be a little bit complicated, so I will try to explain it.
 * What we are doing here is to ensure any protected path requires
 * the JWT Token to be sent over from the client to avoid unauthorized
 * access from some random dude accessing it. 
 * 
 * It reads the authorization HTTP header sent to it, and then it checks if
 * it is in the Authorization: Bearer <token> format (this needs to be sent to the backend).
 * 
 * It then verifies the JWT token using a function. If it succeeds
 * it attaches the decoded JWT payload(data) to the req.user and continues the request
 * otherwise it will stop the request and return a 401 error
 * to the frontend.
 * 
 * TLDR: Avoids unauthorized access to routes that need it. 
 * Send Authorization: Bearer <Token> header from the frontend if you want to access any path that uses this.
 */
const { verifyJWToken } = require('../utilities/jwt')
const { extractBearerToken } = require('../utilities/authHeader');
const Response = require('../utilities/response');
// Next passes control to the next middleware/handler, used to stop/continue execution
function authRequired(req, res, next) {
    // Use the shared helper to extract the bearer token, how this works is explained in the comments at top.
    const { ok, token, errorMessage } = extractBearerToken(req);
    if (!ok) {
    return res
      .status(401)
      .json(new Response(false, 401, errorMessage, null));
  }
    // For verification of the JWT
    const {valid, expired, decoded} = verifyJWToken(token);
    
    if (!valid) {
        const message = expired ? 'Token expired' : 'Invalid token'; // Check to see if token is expired, if not the token was invalid.
        return res
            .status(401)
            .json(new Response(false, 401, message, null));
    }
    req.user = decoded; // Decoded payload request, eg {id, username,email etc...}
    next();
}
module.exports = {
    authRequired,
};
‎backend/src/middleware/cors.js‎
+19Lines changed: 19 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,19 @@
/**
 * This is a placeholder CORS until the frontend is specified
 */
const cors = require('cors');
// This is random
const FRONTEND_ORIGIN = 'http://localhost:5173';
// Only send CORS headers when testing when the request Origin matches FRONTEND_ORIGIN
const routeCors = cors({
	origin: [FRONTEND_ORIGIN],
	credentials: true,
});
module.exports = {
	routeCors,
	FRONTEND_ORIGIN,
};
‎backend/src/models/userModel.js‎
+74Lines changed: 74 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,74 @@
/**
 * Contains SQL queries for getting a user by id and creating a new one.
 */
const {pool} = require('../utilities/database');
const hash = require('../utilities/password');
// Return user by id
async function getUserById(id){
    const query = `SELECT id, username, email, created_at, updated_at
     FROM users
     WHERE id = $1 `;
     try{
     const {rows} = await pool.query(query, [id]);
     return rows[0];
    } catch(err){
        console.error('Error getting user by id:', err.message);
        throw err;
    }
}
// Get user by Email, used by Login endpoints
async function getUserByEmail(email){
  const query = `
  SELECT id, username, password_hash, created_at, updated_at
  FROM users
  WHERE email = $1
  `;
  try {
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  } catch (err) {
    console.error('Error getting user by email', err.message);
    throw err;
  }
}
// Create  the user in db, used by register endpoints
async function createUser(username, email, password) {
  if (!username || !email || !password) {
    throw new Error('Username, Email and the Password are required');
  }
  const query = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at, updated_at
  `;
  try {
    const password_hash = await hash.hashPassword(password);
    const values = [username, email, password_hash];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}
module.exports = {
    getUserById,
    getUserByEmail,
    createUser
}
‎backend/src/routes/routes.js‎
+14-3Lines changed: 14 additions & 3 deletions
Original file line number	Diff line number	Diff line change
@@ -4,11 +4,13 @@
 */

const express = require('express');
const { routeCors } = require('../middleware/cors');
const { authRequired } = require('../middleware/auth');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/hello -> plain text
router.get('/hello', (req, res) => {
// GET /api/hello -> plain text, CORS activated
router.get('/hello', routeCors, (req, res) => {
	res.send('Hello dude from /api/hello');
});

@@ -22,6 +24,15 @@ router.post('/echo', (req, res) => {
	res.json({ youSent: req.body });
});

// This route is protected by our Authorization middleware.
router.get('/users/:id', authRequired, userController.getUser);
router.post('/users', userController.createUser);
router.post('/login', userController.login);
router.get('/token-status', userController.checkTokenStatus);
module.exports = router;


‎backend/src/utilities/authHeader.js‎
+29Lines changed: 29 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,29 @@
/**
 * Utility to extract a Bearer token from the Authorization header.
 * It reads the authorization HTTP header sent to it, and then it checks if
 * it is in the Authorization: Bearer <token> format (this needs to be sent to the backend).
 * Returns a small object so callers can decide their separate status codes.
 */
function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return {
      ok: false,
      token: null,
      errorMessage: 'Authorization header is missing or incorrect',
    };
  }
  return {
    ok: true,
    token,
    errorMessage: null,
  };
}
module.exports = {
  extractBearerToken,
};
‎backend/src/utilities/database.js‎
+20Lines changed: 20 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,20 @@
/**
 * Simple database connection to postgre.
 */
const config = require('../config/config');
const {Pool} = require('pg');
const pool = new Pool(
    {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name
    }
)
module.exports = {pool};
‎backend/src/utilities/jwt.js‎
+45Lines changed: 45 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,45 @@
/**
 * Simple JWT Token generator.
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const JWT_SECRET = config.auth.jwtSecret;
const JWT_EXPIRATION = config.auth.jwtExpiration;
function signJWToken(payload, options = {}) {
    // Allows overriding expiresIn if required
    const signOptions = {
        expiresIn: JWT_EXPIRATION, ...options // This little guy(...options) is responsible for overriding the timeout if needed
    };
    return jwt.sign(payload, JWT_SECRET, signOptions);
}
function verifyJWToken(token){
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { 
            valid: true,
            expired: false,
            decoded,
            error: null
        };
    } catch (err) {
        console.log('JWT Token verification failed', err.message);
        return {
            valid: false,
            expired: err.name === 'TokenExpiredError',
            decoded: null,
            error: err,
        };
    }
}
module.exports = {
    signJWToken,
    verifyJWToken
}
‎backend/src/utilities/password.js‎
+32Lines changed: 32 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,32 @@
/**
 * Simple encryption using bcrypt. It hashes the password and deals with that.
 * 
 * SALT_ROUNDS defines the number of times the algorithm will run,
 * more means a more secure password hash.
 */
const bcrypt = require('bcryptjs');
const config = require('../config/config');
const SALT_ROUNDS = Number(config.auth.salt_rounds) || 10;
async function hashPassword(password) {
    if (!password)
        throw new Error('Password is missing');
    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
}
async function comparePassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword)
        return false;
    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
}
module.exports = {
    hashPassword,
    comparePassword
};
‎backend/src/utilities/response.js‎
+12Lines changed: 12 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,12 @@
// Custom response class to better show the codes and messages.
class response {
    constructor(status = false, code = 400, message = "", data = null) {
        this.status = status;
        this.code = code;
        this.message = message;
        this.data = data;
    }
}
module.exports = response;
‎backend/tests/test-cors.js‎
+65Lines changed: 65 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,65 @@
/**
 * A simple CORS test I wrote, basically takes two different URLs,
 * the first one is allowed through CORS while the second one is not.
 * Then, it runs the test with the hostname, the port and the endpoint method.
 * 
 */
const http = require('http');
const PORT = 3000;
const PATH = '/api/hello';
// Origins to test: first is the allowed placeholder defined in the cors.js file, second is a disallowed one
const originsToTest = [
  'http://localhost:5173',
  'http://LUT.com',
];
function testOrigin(origin) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: PATH,
      method: 'GET',
      headers: {
        Origin: origin,
      },
    };
    const req = http.request(options, (res) => {
      const allowedOrigin = res.headers['access-control-allow-origin'];
      const isAllowed = allowedOrigin === origin;
      console.log('-Testing CORS-');
      console.log('Origin:          ', origin);
      console.log('Response Allow-Origin:   ', allowedOrigin || '(none)');
      console.log('CORS OK for this origin: ', isAllowed);
      console.log('');
      resolve(isAllowed);
    });
    req.on('error', (err) => {
      console.error('Request failed for:', origin, err.message);
      reject(err);
    });
    req.end();
  });
}
async function runTest() {
  for (const origin of originsToTest) {
    try {
      await testOrigin(origin);
    } catch (e) {
      
    }
  }
  console.log('CORS tests finished.');
}
runTest();
‎backend/tests/test-db-users.js‎
+234Lines changed: 234 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,234 @@
/**
 * A testing file to test the connection to the database with http requests.
 * It now tests:
 *  - Register:            POST /api/users
 *  - Login (JWT):         POST /api/login
 *  - Protected GET:       GET  /api/users/:id with and without JWT
 *  - Token status check:  GET  /api/token-status with JWT
 */
const http = require('http');
const PORT = 3000;
const USERS_PATH = '/api/users';
const LOGIN_PATH = '/api/login';
const TOKEN_STATUS_PATH = '/api/token-status';
// Perform HTTP request and parse JSON response
function httpJsonRequest({ method, path, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...headers,
      },
    };
    const req = http.request(options, (res) => {
      let rawData = '';
      res.on('data', (chunk) => {
        rawData += chunk;
      });
      res.on('end', () => {
        let parsed;
        if (rawData.length > 0) {
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            console.error('Failed to parse JSON response:', e.message);
          }
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });
    req.on('error', (err) => {
      console.error('HTTP request failed:', err.message);
      reject(err);
    });
    if (data) {
      req.write(data);
    }
    req.end();
  });
}
async function getUserByIdViaApi(id, token) {
  console.log(`\nPath: GET /api/users/${id}`);
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const res = await httpJsonRequest({
    method: 'GET',
    path: `${USERS_PATH}/${id}`,
    headers,
  });
  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));
  if (!res.body) {
    console.error('No JSON body returned from GET /api/users/:id');
  } else {
    console.log('Custom response wrapper looks OK for GET /api/users/:id');
  }
  return res;
}
async function registerUserViaApi() {
  console.log('\nPath: POST /api/users (register user)');
  const unique = Date.now();
  const credentials = {
    username: `testboi_${unique}`,
    email: `testboi_${unique}@example.com`,
    password: 'some_plain_password_test',
  };
  const res = await httpJsonRequest({
    method: 'POST',
    path: USERS_PATH,
    body: credentials,
  });
  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));
  if (!res.body || res.body.status !== true || !res.body.data) {
    console.error('Unexpected response structure from POST /api/users');
  } else {
    console.log('Custom response wrapper looks OK for POST /api/users');
  }
  const newUser = res.body && res.body.data;
  return { newUser, credentials };
}
async function loginUserViaApi(email, password) {
  console.log('\nPath: POST /api/login (login user)');
  const res = await httpJsonRequest({
    method: 'POST',
    path: LOGIN_PATH,
    body: { email, password },
  });
  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));
  if (!res.body || res.body.status !== true || !res.body.data) {
    console.error('Unexpected response structure from POST /api/login');
  } else {
    console.log('Custom response wrapper looks OK for POST /api/login');
  }
  const token = res.body.data && res.body.data.jwToken;
  if (!token) {
    console.error('No jwToken returned from /api/login');
  } else {
    console.log('Received jwToken of length:', token.length);
  }
  return { res, token };
}
async function checkTokenStatusViaApi(token) {
  console.log('\nPath: GET /api/token-status (check token status)');
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};
  const res = await httpJsonRequest({
    method: 'GET',
    path: TOKEN_STATUS_PATH,
    headers,
  });
  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));
  return res;
}
async function run() {
  try {
    console.log('--- Starting DB + JWT + token-status test ---');
    // 1) Register a new user
    const { newUser, credentials } = await registerUserViaApi();
    if (!newUser || !newUser.id) {
      console.error('Registration did not return a valid user id, aborting.');
      return;
    }
    console.log('Registered user id:', newUser.id);
    // 2) Login to get JWT
    const { token } = await loginUserViaApi(credentials.email, credentials.password);
    if (!token) {
      console.error('Login did not return a valid token, aborting.');
      return;
    }
    // 3) Try protected GET without token (should fail with 401)
    const resNoToken = await getUserByIdViaApi(newUser.id, null);
    if (resNoToken.statusCode === 401) {
      console.log('As expected, GET /api/users/:id without token returned 401.');
    } else {
      console.error(
        'Unexpected status for GET /api/users/:id without token. Expected 401, got',
        resNoToken.statusCode
      );
    }
    // 4) Try protected GET with token (should succeed)
    const resWithToken = await getUserByIdViaApi(newUser.id, token);
    if (resWithToken.statusCode === 200 && resWithToken.body && resWithToken.body.status === true) {
      console.log('GET /api/users/:id with valid token succeeded as expected.');
    } else {
      console.error(
        'Unexpected status/body for GET /api/users/:id with token. Status:',
        resWithToken.statusCode
      );
    }
    // 5) Check token status endpoint
    const statusRes = await checkTokenStatusViaApi(token);
    if (
      statusRes.statusCode === 200 &&
      statusRes.body &&
      statusRes.body.data &&
      statusRes.body.data.valid === true
    ) {
      console.log('/api/token-status reports token is valid as expected.');
    } else {
      console.error('Unexpected response from /api/token-status');
    }
    console.log('--- Test run finished ---');
  } catch (err) {
    console.error('Test run failed with error:', err.message);
  } finally {
    process.exit(0);
  }
}
run();
‎backend/tests/test-db.js‎
+25Lines changed: 25 additions & 0 deletions
Original file line number	Diff line number	Diff line change
@@ -0,0 +1,25 @@
// This is obsolete, I just left it for now. It just prints all users. 
const {pool} = require('../src/utilities/database');
async function printAllUsers(){
    try {
        console.log('Running Postgre database test');
        let testString = "SELECT id, username, email, first_name, last_name FROM users"
        console.log(`test SQL query: ${testString}`);
        
        const result = await pool.query('SELECT id, username, email, first_name, last_name FROM users');
        console.log(JSON.stringify(result.rows, null, 2));
    }
    catch(err) {
        console.error('Error querying users:', err.message);
    }
    finally {
        await pool.end();
        process.exit(0);
    }
}
printAllUsers();
0 commit comments
Comments
0 (0)

You're not receiving notifications from this thread.
3 files remain