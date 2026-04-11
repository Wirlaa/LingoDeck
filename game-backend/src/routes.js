const express = require("express");

const { generateQuest, submitQuest } = require("./controllers/questController");
const { openPack } = require("./controllers/cardController");
const {
  startChallenge,
  challengeAction,
  getChallenge,
} = require("./controllers/challengeController");
const { requireAuth } = require("./middleware/auth");

const router = express.Router();

// Quests (JWT required)
router.post("/quests/generate", requireAuth, generateQuest);
router.post("/quests/submit", requireAuth, submitQuest);

// Cards (JWT required)
router.post("/cards/open-pack", requireAuth, openPack);

// Challenges (JWT required)
router.post("/challenges/start", requireAuth, startChallenge);
router.post("/challenges/:sessionId/action", requireAuth, challengeAction);
router.get("/challenges/:sessionId", requireAuth, getChallenge);

module.exports = router;