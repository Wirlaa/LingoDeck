const { cardClient } = require("../../microserviceClient");
const Response = require("../utilities/response");

// POST /api/cards/open-pack
async function openPack(req, res) {
  try {
    const { data } = await cardClient.post("/cards/open-pack", req.body);
    return res.status(200).json(new Response(true, 200, "Pack opened", data));
  } catch (err) {
    console.error("openPack error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to open pack";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

// GET /api/cards/collection/:userId
async function getCollection(req, res) {
  try {
    const { data } = await cardClient.get(`/cards/collection/${req.params.userId}`);
    return res.status(200).json(new Response(true, 200, "Collection fetched", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to fetch collection", null));
  }
}

// GET /api/cards/collection/:userId/scenario/:scenario
async function getCollectionByScenario(req, res) {
  try {
    const { data } = await cardClient.get(
      `/cards/collection/${req.params.userId}/scenario/${req.params.scenario}`
    );
    return res.status(200).json(new Response(true, 200, "Collection fetched", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to fetch collection", null));
  }
}

// POST /api/cards/xp
async function addXp(req, res) {
  try {
    const { data } = await cardClient.post("/cards/xp", req.body);
    return res.status(200).json(new Response(true, 200, "XP added", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to add XP", null));
  }
}

// GET /api/cards/battle-ready/:userId/:scenario
async function getBattleDeck(req, res) {
  try {
    const { data } = await cardClient.get(
      `/cards/battle-ready/${req.params.userId}/${req.params.scenario}`
    );
    return res.status(200).json(new Response(true, 200, "Battle deck fetched", data));
  } catch (err) {
    const status = err.response?.status || 500;
    return res.status(status).json(new Response(false, status, "Failed to fetch battle deck", null));
  }
}

module.exports = { openPack, getCollection, getCollectionByScenario, addXp, getBattleDeck };
