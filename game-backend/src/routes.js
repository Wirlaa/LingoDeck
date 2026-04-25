const express = require("express");

const { openPack, getCollection, getCollectionByScenario, addXp, getBattleDeck } = require("./controllers/cardController");
const { startChallenge, challengeAction, getChallenge, preTurn, getHand, getScenarios } = require("./controllers/challengeController");
const { requireAuth } = require("./middleware/auth");
const { generateQuest, submitQuest, generateInternalQuest } = require("./controllers/questController");
const { questHealth, questSeed, questContent, cardHealth, challengeHealth } = require("./controllers/adminController");
const { getUnlocks, unlockScenario } = require("./controllers/scenarioController");

const router = express.Router();

// Cards
router.post("/cards/open-pack", requireAuth, openPack);
router.get("/cards/collection/:userId", requireAuth, getCollection);
router.get("/cards/collection/:userId/scenario/:scenario", requireAuth, getCollectionByScenario);
router.post("/cards/xp", requireAuth, addXp);
router.get("/cards/battle-ready/:userId/:scenario", requireAuth, getBattleDeck);

// Scenarios
router.get("/scenarios/unlocks/:userId", requireAuth, getUnlocks);
router.post("/scenarios/unlock", requireAuth, unlockScenario);

// Challenges
router.get("/challenges/scenarios", getScenarios);
router.post("/challenges/start", requireAuth, startChallenge);
router.post("/challenges/:sessionId/action", requireAuth, challengeAction);
router.get("/challenges/:sessionId", requireAuth, getChallenge);
router.post("/challenges/:sessionId/pre-turn", requireAuth, preTurn);
router.get("/challenges/:sessionId/hand", requireAuth, getHand);

// Quests
router.post("/quests/generate", requireAuth, generateQuest);
router.post("/quests/generate-internal", requireAuth, generateInternalQuest);
router.post("/quests/submit", requireAuth, submitQuest);
router.get("/quests/challenges/:userId", requireAuth, async (req, res) => {
  const { questClient } = require("./../microserviceClient");
  const Response = require("./utilities/response");
  try {
    const { data } = await questClient.get(`/quests/challenges/${req.params.userId}`);
    return res.status(200).json(new Response(true, 200, "Challenges fetched", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to fetch challenges", null));
  }
});

// Admin
router.get("/admin/quest/health", questHealth);
router.post("/admin/quest/seed", requireAuth, questSeed);
router.get("/admin/quest/content", requireAuth, questContent);
router.get("/admin/card/health", cardHealth);
router.get("/admin/challenge/health", challengeHealth);


module.exports = router;
