// game-backend/tests/test-microservices.js
// Run with:  node tests/microTest.js
//
// Modes:
//   Direct (no Traefik):
//     node tests/microTest.js
//
//   Via Traefik hostnames (HTTPS):
//     # e.g. hosts: 127.0.0.1 auth.localhost api.localhost
//     # on Windows PowerShell:
//     $env:USE_TRAEFIK="true"
//     $env:NODE_TLS_REJECT_UNAUTHORIZED="0"
//     node tests/microTest.js

const http = require("http");
const https = require("https");

// When USE_TRAEFIK=true, talk to Traefik hostnames over HTTPS:443.
// Otherwise, hit the raw container ports on localhost.
const USE_TRAEFIK = process.env.USE_TRAEFIK === "true";

// For local Traefik:
//   - auth backend   → https://auth.localhost
//   - game-backend   → https://api.localhost
// For cloud, set these via env to your real domains, e.g.
//   AUTH_HOST=auth.yourdomain.com
//   GAME_HOST=api.yourdomain.com
const AUTH_HOST =
  process.env.AUTH_HOST || (USE_TRAEFIK ? "auth.localhost" : "localhost");
const GAME_HOST =
  process.env.GAME_HOST || (USE_TRAEFIK ? "api.localhost" : "localhost");

const AUTH_PORT = Number(process.env.AUTH_PORT) || (USE_TRAEFIK ? 443 : 3000);
const GAME_PORT = Number(process.env.GAME_PORT) || (USE_TRAEFIK ? 443 : 4000);

// Core request helper; supports HTTP and HTTPS.
function httpJsonRequest({
  hostname,
  port,
  path,
  method,
  body,
  headers = {},
  useHttps = false,
}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const client = useHttps ? https : http;

    const options = {
      hostname,
      port,
      path,
      method,
      headers: {
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        ...headers,
      },
      // For local Traefik with self-signed certs you can run the test with:
      //   NODE_TLS_REJECT_UNAUTHORIZED=0
      ...(useHttps && process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
        ? { rejectUnauthorized: false }
        : {}),
    };

    const req = client.request(options, (res) => {
      let rawData = "";

      res.on("data", (chunk) => {
        rawData += chunk;
      });

      res.on("end", () => {
        let parsed = null;
        if (rawData.length > 0) {
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            console.error("Failed to parse JSON response:", e.message);
          }
        }
        resolve({ statusCode: res.statusCode, headers: res.headers, body: parsed });
      });
    });

    req.on("error", (err) => {
      console.error("HTTP request failed:", err.message);
      reject(err);
    });

    if (data) req.write(data);
    req.end();
  });
}

// Convenience wrappers
function authRequest(opts) {
  return httpJsonRequest({
    hostname: AUTH_HOST,
    port: AUTH_PORT,
    useHttps: USE_TRAEFIK,
    ...opts,
  });
}

function gameRequest(opts) {
  return httpJsonRequest({
    hostname: GAME_HOST,
    port: GAME_PORT,
    useHttps: USE_TRAEFIK,
    ...opts,
  });
}

// --- Auth helpers (reuse backend flow) --------------------------------------

async function registerUserViaAuth() {
  console.log("\n[AUTH] POST /api/users (register)");
  const unique = Date.now();
  const credentials = {
    username: `microtest_${unique}`,
    email: `microtest_${unique}@example.com`,
    password: "some_plain_password_test",
  };

  const res = await authRequest({
    method: "POST",
    path: "/api/users",
    body: credentials,
  });

  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
  const newUser = res.body && res.body.data;
  if (!newUser || !newUser.id) {
    throw new Error("Registration did not return a valid user id");
  }
  return { newUser, credentials };
}

async function loginUserViaAuth(email, password) {
  console.log("\n[AUTH] POST /api/login (login)");
  const res = await authRequest({
    method: "POST",
    path: "/api/login",
    body: { email, password },
  });

  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
  const token = res.body && res.body.data && res.body.data.jwToken;
  if (!token) {
    throw new Error("Login did not return jwToken");
  }
  return token;
}

// --- Game-backend + Python microservice tests -------------------------------

async function callQuestAdmin(token) {
  const authHeader = { Authorization: `Bearer ${token}` };

  console.log("\n[GAME] POST /api/admin/quest/seed");
  let res = await gameRequest({
    method: "POST",
    path: "/api/admin/quest/seed",
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/admin/quest/health");
  res = await gameRequest({
    method: "GET",
    path: "/api/admin/quest/health",
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/admin/quest/content");
  res = await gameRequest({
    method: "GET",
    path: "/api/admin/quest/content",
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log(
    "Body length:",
    Array.isArray(res.body?.data) ? res.body.data.length : "n/a"
  );
}

async function callCardAdmin() {
  console.log("\n[GAME] GET /api/admin/card/health");
  const res = await gameRequest({
    method: "GET",
    path: "/api/admin/card/health",
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

async function callChallengeAdmin() {
  console.log("\n[GAME] GET /api/admin/challenge/health");
  const res = await gameRequest({
    method: "GET",
    path: "/api/admin/challenge/health",
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

async function testQuests(token, userId) {
  const authHeader = { Authorization: `Bearer ${token}` };

  console.log("\n[GAME] POST /api/quests/generate");
  const genReq = {
    user_id: String(userId),
    scenario_tag: null,
    difficulty_target: 0.5,
  };
  let res = await gameRequest({
    method: "POST",
    path: "/api/quests/generate",
    headers: authHeader,
    body: genReq,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
  const questOut = res.body && res.body.data;
  const questId = questOut && questOut.id;

  console.log("\n[GAME] POST /api/quests/generate-internal");
  res = await gameRequest({
    method: "POST",
    path: "/api/quests/generate-internal",
    headers: authHeader,
    body: genReq,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  if (!questId) {
    console.warn("No quest id from /quests/generate; skipping /quests/submit");
  } else {
    console.log("\n[GAME] POST /api/quests/submit");
    const submitReq = {
      quest_id: questId,
      user_id: String(userId),
      given_answer: "test_answer", // likely incorrect, but endpoint should still work
    };
    res = await gameRequest({
      method: "POST",
      path: "/api/quests/submit",
      headers: authHeader,
      body: submitReq,
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
  }

  console.log("\n[GAME] GET /api/quests/challenges/:userId");
  res = await gameRequest({
    method: "GET",
    path: `/api/quests/challenges/${userId}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

async function testCards(token, userId) {
  const authHeader = { Authorization: `Bearer ${token}` };

  console.log("\n[GAME] POST /api/cards/open-pack");
  const packReq = {
    user_id: String(userId),
    // Bias toward some scenario; can be null as well
    scenario_bias: "cafe_intro",
  };
  let res = await gameRequest({
    method: "POST",
    path: "/api/cards/open-pack",
    headers: authHeader,
    body: packReq,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  const packData = res.body && res.body.data;
  const cards = (packData && packData.cards) || [];
  const firstCard = cards[0] || {};
  const cardScenario = firstCard.scenario || "cafe_intro";
  const cardWordFi = firstCard.word_fi || "sana1";

  console.log("\n[GAME] GET /api/cards/collection/:userId");
  res = await gameRequest({
    method: "GET",
    path: `/api/cards/collection/${userId}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/cards/collection/:userId/scenario/:scenario");
  res = await gameRequest({
    method: "GET",
    path: `/api/cards/collection/${userId}/scenario/${encodeURIComponent(
      cardScenario
    )}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] POST /api/cards/xp");
  res = await gameRequest({
    method: "POST",
    path: "/api/cards/xp",
    headers: authHeader,
    body: {
      user_id: String(userId),
      word_fi: cardWordFi,
      xp: 1,
    },
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/cards/battle-ready/:userId/:scenario");
  res = await gameRequest({
    method: "GET",
    path: `/api/cards/battle-ready/${userId}/${encodeURIComponent(
      cardScenario
    )}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

async function testScenarios(token, userId) {
  const authHeader = { Authorization: `Bearer ${token}` };

  console.log("\n[GAME] GET /api/scenarios/unlocks/:userId");
  let res = await gameRequest({
    method: "GET",
    path: `/api/scenarios/unlocks/${userId}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  const beatenScenario = "cafe_intro";

  console.log("\n[GAME] POST /api/scenarios/unlock");
  res = await gameRequest({
    method: "POST",
    path: "/api/scenarios/unlock",
    headers: authHeader,
    body: {
      user_id: String(userId),
      beaten_scenario: beatenScenario,
    },
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/scenarios/unlocks/:userId (after unlock)");
  res = await gameRequest({
    method: "GET",
    path: `/api/scenarios/unlocks/${userId}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

async function testChallenges(token, userId) {
  const authHeader = { Authorization: `Bearer ${token}` };

  // Minimal fake deck (KELA_MIN_DECK_SIZE is 6 by default)
  const deck = Array.from({ length: 6 }).map((_, i) => ({
    card_id: `test-card-${i + 1}`,
    rarity: "Common",
    word_fi: `sana${i + 1}`,
    power: 5,
  }));

  console.log("\n[GAME] POST /api/challenges/start");
  let res = await gameRequest({
    method: "POST",
    path: "/api/challenges/start",
    headers: authHeader,
    body: {
      user_id: String(userId),
      deck,
      scenario: "kela_boss",
    },
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  const state = res.body && res.body.data;
  const sessionId = state && state.session_id;
  const nextQuestion = state && state.next_question;
  const hand = state && state.hand;

  if (!sessionId || !nextQuestion) {
    console.warn("No session_id/next_question returned; skipping further tests.");
    return;
  }

  const questionId = nextQuestion.id;
  const answerOption =
    Array.isArray(nextQuestion.options) && nextQuestion.options.length > 0
      ? nextQuestion.options[0]
      : "foo";

  // Choose some card to play as the answer card.
  // Prefer a card from hand, otherwise fall back to first deck card.
  const answerCardId =
    (Array.isArray(hand) && hand.length > 0 && hand[0].card_id) || deck[0].card_id;

  // Optionally pick a support card (different from the answer card) from hand.
  const supportCardId =
    Array.isArray(hand) && hand.length > 1
      ? hand.find((c) => c.card_id !== answerCardId)?.card_id || null
      : null;

  if (supportCardId) {
    console.log("\n[GAME] POST /api/challenges/:sessionId/pre-turn");
    res = await gameRequest({
      method: "POST",
      path: `/api/challenges/${sessionId}/pre-turn`,
      headers: authHeader,
      body: { support_card_id: supportCardId },
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
  } else {
    console.warn("No support card in hand; skipping pre-turn test.");
  }

  console.log("\n[GAME] POST /api/challenges/:sessionId/action");
  res = await gameRequest({
    method: "POST",
    path: `/api/challenges/${sessionId}/action`,
    headers: authHeader,
    body: {
      question_id: questionId,
      given_answer: answerOption,
      answer_card_id: answerCardId,
      support_card_id: supportCardId,
    },
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/challenges/:sessionId");
  res = await gameRequest({
    method: "GET",
    path: `/api/challenges/${sessionId}`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));

  console.log("\n[GAME] GET /api/challenges/:sessionId/hand");
  res = await gameRequest({
    method: "GET",
    path: `/api/challenges/${sessionId}/hand`,
    headers: authHeader,
  });
  console.log("Status:", res.statusCode);
  console.log("Body:", JSON.stringify(res.body, null, 2));
}

// --- Main runner ------------------------------------------------------------

async function run() {
  try {
    console.log("--- Microservice end-to-end test via game-backend ---");
    console.log(
      `Mode: ${USE_TRAEFIK ? "Traefik (HTTPS)" : "Direct (localhost ports)"}`,
    );
    console.log(
      `Auth → ${AUTH_HOST}:${AUTH_PORT}, Game → ${GAME_HOST}:${GAME_PORT}`,
    );

    // 1) Get JWT from auth backend
    const { newUser, credentials } = await registerUserViaAuth();
    const token = await loginUserViaAuth(credentials.email, credentials.password);
    const userId = newUser.id;
    console.log("Got user id:", userId);
    console.log("Got JWT length:", token.length);

    // 2) Quest admin + content (quest-service admin endpoints)
    await callQuestAdmin(token);

    // 3) Card/challenge admin health
    await callCardAdmin();
    await callChallengeAdmin();

    // 4) Quest endpoints (quests router)
    await testQuests(token, userId);

    // 5) Card endpoints (card-service router)
    await testCards(token, userId);

    // 6) Scenario endpoints (scenario router)
    await testScenarios(token, userId);

    // 7) Challenge endpoints (challenges router)
    await testChallenges(token, userId);

    console.log("--- Test run finished ---");
  } catch (err) {
    console.error("Test run failed:", err);
  } finally {
    process.exit(0);
  }
}

run();