const express = require("express");

const { openPack } = require("./controllers/cardController");
const { startChallenge, challengeAction, getChallenge, } = require("./controllers/challengeController");
const { requireAuth } = require("./middleware/auth");

const { generateQuest, submitQuest, generateInternalQuest } = require("./controllers/questController");

const { questHealth, questSeed, questContent, cardHealth, challengeHealth,} = require("./controllers/adminController");

const router = express.Router();


// Cards (JWT required)
router.post("/cards/open-pack", requireAuth, openPack);

// Challenges (JWT required)
router.post("/challenges/start", requireAuth, startChallenge);
router.post("/challenges/:sessionId/action", requireAuth, challengeAction);
router.get("/challenges/:sessionId", requireAuth, getChallenge);

router.post("/quests/generate", requireAuth, generateQuest);
router.post("/quests/generate-internal", requireAuth, generateInternalQuest);
router.post("/quests/submit", requireAuth, submitQuest);

router.get("/admin/quest/health", questHealth);                  // can be public
router.post("/admin/quest/seed", requireAuth, questSeed);        // protected
router.get("/admin/quest/content", requireAuth, questContent);   // protected

router.get("/admin/card/health", cardHealth);
router.get("/admin/challenge/health", challengeHealth);

module.exports = router;