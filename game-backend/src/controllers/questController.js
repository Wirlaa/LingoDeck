const Response = require("../utilities/response");
const { questClient, withSecretHeaders } = require("../../microserviceClient");

// POST /api/quests/generate
async function generateQuest(req, res) {
  try {
    const { data } = await questClient.post("/quests/generate", req.body);
    return res
      .status(201)
      .json(new Response(true, 201, "Quest generated", data));
  } catch (err) {
    console.error("generateQuest error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to generate quest";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

// POST /api/quests/submit
async function submitQuest(req, res) {
  try {
    const { data } = await questClient.post("/quests/submit", req.body);
    return res
      .status(200)
      .json(new Response(true, 200, "Quest scored", data));
  } catch (err) {
    console.error("submitQuest error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to submit quest";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

async function generateInternalQuest(req, res) {
  try {
    const { data } = await questClient.post(
      "/quests/generate-internal",
      req.body,
      withSecretHeaders()
    );
    return res
      .status(201)
      .json(new Response(true, 201, "Internal quest generated", data));
  } catch (err) {
    console.error("generateInternalQuest error:", err.message);
    const status = err.response?.status || 500;
    const detail =
      err.response?.data?.detail || "Failed to generate internal quest";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

module.exports = { generateQuest, submitQuest, generateInternalQuest };