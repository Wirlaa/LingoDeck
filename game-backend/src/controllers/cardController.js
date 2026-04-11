const { cardClient } = require("../../microserviceClient");
const Response = require("../utilities/response");

// POST /api/cards/open-pack
async function openPack(req, res) {
  try {
    const { data } = await cardClient.post("/cards/open-pack", req.body);
    return res
      .status(200)
      .json(new Response(true, 200, "Pack opened", data));
  } catch (err) {
    console.error("openPack error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to open pack";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

module.exports = { openPack };