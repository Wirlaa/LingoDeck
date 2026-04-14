const { cardClient } = require("../../microserviceClient");
const Response = require("../utilities/response");

// GET /api/scenarios/unlocks/:userId
async function getUnlocks(req, res) {
  try {
    const { data } = await cardClient.get(`/scenarios/unlocks/${req.params.userId}`);
    return res.status(200).json(new Response(true, 200, "Unlocks fetched", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to fetch unlocks", null));
  }
}

// POST /api/scenarios/unlock
async function unlockScenario(req, res) {
  try {
    const { data } = await cardClient.post("/scenarios/unlock", req.body);
    return res.status(200).json(new Response(true, 200, "Scenario unlocked", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to unlock scenario", null));
  }
}

module.exports = { getUnlocks, unlockScenario };
