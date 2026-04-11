const { challengeClient } = require("../../microserviceClient");
const Response = require("../utilities/response");

// POST /api/challenges/start
async function startChallenge(req, res) {
  try {
    const { data } = await challengeClient.post("/challenges/start", req.body);
    return res
      .status(201)
      .json(new Response(true, 201, "Challenge started", data));
  } catch (err) {
    console.error("startChallenge error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to start challenge";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

// POST /api/challenges/:sessionId/action
async function challengeAction(req, res) {
  const { sessionId } = req.params;

  try {
    const { data } = await challengeClient.post(
      `/challenges/${sessionId}/action`,
      req.body,
    );
    return res
      .status(200)
      .json(new Response(true, 200, "Action processed", data));
  } catch (err) {
    console.error("challengeAction error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to process action";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

// GET /api/challenges/:sessionId
async function getChallenge(req, res) {
  const { sessionId } = req.params;

  try {
    const { data } = await challengeClient.get(`/challenges/${sessionId}`);
    return res
      .status(200)
      .json(new Response(true, 200, "Challenge fetched", data));
  } catch (err) {
    console.error("getChallenge error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Failed to fetch challenge";
    return res
      .status(status)
      .json(new Response(false, status, detail, null));
  }
}

module.exports = { startChallenge, challengeAction, getChallenge };