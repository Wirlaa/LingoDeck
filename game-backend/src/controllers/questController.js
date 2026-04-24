const Response = require("../utilities/response");
const { questClient, cardClient, withSecretHeaders } = require("../../microserviceClient");

// POST /api/quests/generate
async function generateQuest(req, res) {
  try {
    const { data } = await questClient.post("/quests/generate", req.body);
    return res.status(201).json(new Response(true, 201, "Quest generated", data));
  } catch (err) {
      console.error("generateQuest error:", err.message);
      const status = err.response?.status || 500;
      const detail =
          err.response?.data?.detail ||
          err.response?.data?.message ||
          `Quest service unreachable: ${err.code || err.message}`;
          return res.status(status).json(new Response(false, status, detail, null));
  }
}

// POST /api/quests/submit
async function submitQuest(req, res) {
  const { user_id } = req.body || {};

  try {
    const { data } = await questClient.post("/quests/submit", req.body);

    // Fire-and-forget side effects — don't block the response
    _handleQuestSideEffects(user_id, data).catch(err =>
      console.error("Quest side-effect error:", err.message)
    );

    return res.status(200).json(new Response(true, 200, "Quest scored", data));
  } catch (err) {
    console.error("submitQuest error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to submit quest";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

async function _handleQuestSideEffects(user_id, result) {
  if (!user_id) return;

  // Grant XP to the card for this word if answer was correct
  if (result.is_correct && result.target_word_fi) {
    await cardClient.post("/cards/xp", {
      user_id,
      word_fi: result.target_word_fi,
      xp: 1,
    }).catch(e => console.error("XP grant failed:", e.message));
  }

  // Open a pack for each completed challenge
  const challenges = result.completed_challenges || [];
  for (const ch of challenges) {
    await cardClient.post("/cards/open-pack", {
      user_id,
      scenario_bias: ch.pack_scenario_bias || null,
    }).catch(e => console.error("Challenge pack open failed:", e.message));
    console.log(`Pack opened for challenge: ${ch.name} (bias: ${ch.pack_scenario_bias})`);
  }
}

async function generateInternalQuest(req, res) {
  try {
    const { data } = await questClient.post(
      "/quests/generate-internal",
      req.body,
      withSecretHeaders()
    );
    return res.status(201).json(new Response(true, 201, "Internal quest generated", data));
  } catch (err) {
    console.error("generateInternalQuest error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to generate internal quest";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

module.exports = { generateQuest, submitQuest, generateInternalQuest };
