const { challengeClient, cardClient } = require("../../microserviceClient");
const Response = require("../utilities/response");

// POST /api/challenges/start
async function startChallenge(req, res) {
  try {
    const { data } = await challengeClient.post("/challenges/start", req.body);
    return res.status(201).json(new Response(true, 201, "Challenge started", data));
  } catch (err) {
    console.error("startChallenge error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to start challenge";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

// POST /api/challenges/:sessionId/action
async function challengeAction(req, res) {
  const { sessionId } = req.params;
  const user_id = req.user?.id?.toString() || req.body?.user_id;

  try {
    const { data } = await challengeClient.post(
      `/challenges/${sessionId}/action`,
      req.body,
    );

    // Fire-and-forget side effects
    _handleBattleSideEffects(user_id, data).catch(err =>
      console.error("Battle side-effect error:", err.message)
    );

    return res.status(200).json(new Response(true, 200, "Action processed", data));
  } catch (err) {
    console.error("challengeAction error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to process action";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

async function _handleBattleSideEffects(user_id, data) {
  if (!user_id) return;

  // Grant 2 XP per correctly answered word this turn
  const correct_words = data.correct_words_this_turn || [];
  for (const word_fi of correct_words) {
    await cardClient.post("/cards/xp", { user_id, word_fi, xp: 2 })
      .catch(e => console.error("Battle XP grant failed:", e.message));
  }

  // On win: unlock next scenario + open bonus packs
  if (data.status === "won") {
    const scenario = data.scenario;
    const bonus_packs = data.bonus_packs || 0;

    // Unlock next scenario
    await cardClient.post("/scenarios/unlock", {
      user_id,
      beaten_scenario: scenario,
    }).catch(e => console.error("Scenario unlock failed:", e.message));

    // Open bonus packs biased toward the scenario just beaten
    for (let i = 0; i < bonus_packs; i++) {
      await cardClient.post("/cards/open-pack", {
        user_id,
        scenario_bias: scenario,
      }).catch(e => console.error("Bonus pack open failed:", e.message));
    }

    console.log(`Battle won: ${scenario}. Unlocked next scenario. Opened ${bonus_packs} bonus packs.`);
  }
}

// GET /api/challenges/:sessionId
async function getChallenge(req, res) {
  const { sessionId } = req.params;
  try {
    const { data } = await challengeClient.get(`/challenges/${sessionId}`);
    return res.status(200).json(new Response(true, 200, "Challenge fetched", data));
  } catch (err) {
    console.error("getChallenge error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to fetch challenge";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

// POST /api/challenges/:sessionId/pre-turn
async function preTurn(req, res) {
  const { sessionId } = req.params;
  const { support_card_id } = req.body || {};
  try {
    const { data } = await challengeClient.post(
      `/challenges/${sessionId}/pre-turn`,
      null,
      { params: { support_card_id } }
    );
    return res.status(200).json(new Response(true, 200, "Pre-turn applied", data));
  } catch (err) {
    console.error("preTurn error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to apply pre-turn";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

// GET /api/challenges/:sessionId/hand
async function getHand(req, res) {
  const { sessionId } = req.params;
  try {
    const { data } = await challengeClient.get(`/challenges/${sessionId}/hand`);
    return res.status(200).json(new Response(true, 200, "Hand fetched", data));
  } catch (err) {
    console.error("getHand error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to fetch hand";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

module.exports = { startChallenge, challengeAction, getChallenge, preTurn, getHand };
