// game-backend/tests/test-microservices.js
// Run with:  node tests/test-microservices.js
// Prereq: backend (port 3000), game-backend (port 4000),
//         and all Python services (db, quest, card, challenge) running.

const http = require("http");

const AUTH_PORT = 3000;   // Node auth backend (backend/)
const GAME_PORT = 4000;   // game-backend

function httpJsonRequest({ hostname, port, path, method, body, headers = {} }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;

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
    };

    const req = http.request(options, (res) => {
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
  return httpJsonRequest({ hostname: "localhost", port: AUTH_PORT, ...opts });
}
function gameRequest(opts) {
  return httpJsonRequest({ hostname: "localhost", port: GAME_PORT, ...opts });
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
  console.log("Body length:", Array.isArray(res.body?.data) ? res.body.data.length : "n/a");
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
    return;
  }

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

async function testCards(token, userId) {
  const authHeader = { Authorization: `Bearer ${token}` };

  console.log("\n[GAME] POST /api/cards/open-pack");
  const body = {
    user_id: String(userId),
    pack_score: 0.7,
    scenario_tags: null,
  };
  const res = await gameRequest({
    method: "POST",
    path: "/api/cards/open-pack",
    headers: authHeader,
    body,
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

  if (!sessionId || !nextQuestion) {
    console.warn("No session_id/next_question returned; skipping action/get tests.");
    return;
  }

  const questionId = nextQuestion.id;
  const answerOption =
    Array.isArray(nextQuestion.options) && nextQuestion.options.length > 0
      ? nextQuestion.options[0]
      : "foo";

  console.log("\n[GAME] POST /api/challenges/:sessionId/action");
  res = await gameRequest({
    method: "POST",
    path: `/api/challenges/${sessionId}/action`,
    headers: authHeader,
    body: {
      question_id: questionId,
      given_answer: answerOption,
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
}

// --- Main runner ------------------------------------------------------------

async function run() {
  try {
    console.log("--- Microservice end-to-end test via game-backend ---");

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

    // 6) Challenge endpoints (challenges router)
    await testChallenges(token, userId);

    console.log("--- Test run finished ---");
  } catch (err) {
    console.error("Test run failed:", err);
  } finally {
    process.exit(0);
  }
}

run();