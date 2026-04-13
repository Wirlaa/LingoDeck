# 🎮 LingoDeck Game Backend

The **LingoDeck game-backend** is a Node.js service that acts as an **API gateway / Backend-for-Frontend (BFF)** between:

- React frontend  
- Node.js auth backend  
- Python microservices (quest, card, challenge)

It exposes a unified HTTP API, handles authentication, and coordinates communication between services.

Why not directly communicate with the python microservices? Because
this allows us to have more control and we can add more features
to this that do not necessarily need to be handled by the python
microservice.

Also, I'm unifying all the docker compose files into one in the root directory.

---

## 🚀 Responsibilities

- Expose a unified API under `/api` for:
  - Quests (generate, submit, internal generation)
  - Cards (open packs)
  - Challenges (battle flow, actions, state)
  - Admin endpoints (health, seed, content)
- Validate JWTs via auth backend (`/api/token-status`)
- Attach `x-service-secret` headers for protected endpoints
- Handle CORS for frontend access
- Serve OpenAPI documentation via Swagger UI

---

## 📁 Project Structure

```
.
├── app.js                  # App entrypoint
├── routes.js               # Route definitions
├── controllers/
│   ├── questController.js
│   ├── cardController.js
│   ├── challengeController.js
│   └── adminController.js
├── auth.js                 # Auth middleware
├── cors.js                 # CORS middleware
├── microserviceClient.js   # Service clients
├── openapi.json            # OpenAPI specification
├── config.js               # Environment config
└── microTest.js            # Integration test script
```

---

## ⚙️ Prerequisites

- Node.js (v18+ recommended)
- Docker + Docker Compose

### Required Services

- Auth backend (Node.js): `http://localhost:3000`
- Python microservices (quest, card, challenge)
- Shared database (via root `docker-compose.yml`)

---

## 🔧 Configuration

Environment variables are loaded via `config.js`.

### Local Development

```
.env
```

### Docker

```
.env.docker
```

### CORS

Configured in `cors.js`.

> ⚠️ Update allowed origins if your frontend runs on a different URL.

---

## ▶️ Running the Service

### 1. Start Dependencies

From the repo root:

```bash
docker-compose up
```

Start the auth backend (separately):

```bash
cd auth-backend
npm install
npm run dev
```

---

### 2. Run Locally

```bash
npm install
npm run dev
```

Service endpoints:

- API: http://localhost:4000  
- Swagger UI: http://localhost:4000/docs  
- Health: http://localhost:4000/health  

Example endpoints:

```
POST /api/quests/generate
POST /api/cards/open-pack
POST /api/challenges/start
```

---

### 3. Run with Docker

```bash
docker-compose up --build
```

Accessible at:

```
http://localhost:4000
```

Optional hosts entry:

```
127.0.0.1 game.localhost
```

Then:

```
http://game.localhost:4000
```

---

## 🔐 Authentication

Handled via `requireAuth` middleware (`auth.js`):

- Reads `Authorization: Bearer <JWT>`
- Calls auth backend `/api/token-status`
- Rejects invalid/missing tokens (`401`)
- Attaches `req.user` on success

### Protected Routes

All `/api/quests`, `/api/cards`, `/api/challenges` routes require authentication.

---

## 🛠️ Admin & Internal Endpoints

### Quest Admin

```
GET  /api/admin/quest/health
POST /api/admin/quest/seed
GET  /api/admin/quest/content
```

### Card Admin

```
GET /api/admin/card/health
```

### Challenge Admin

```
GET /api/admin/challenge/health
```

### Internal Quest Generation

```
POST /api/quests/generate-internal
```

> These endpoints use `x-service-secret` via `microserviceClient.js`.

---

## 🧪 Testing

Integration test script:

```
microTest.js
```

### What it does:

- Registers & logs in a user
- Calls quest/card/challenge flows
- Tests admin endpoints

### Run:

```bash
node microTest.js
```

---

## 🧱 Extending the Service

Currently, this service acts as a **gateway/BFF**. To evolve it further:



## 📄 API Documentation

Swagger UI available at:

```
http://localhost:4000/docs
```

---

## 🧩 Summary

The LingoDeck game-backend:

- Simplifies frontend communication
- Centralizes authentication
- Orchestrates multiple microservices
- Provides a scalable foundation for game logic