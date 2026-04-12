const { questClient, cardClient, challengeClient, withSecretHeaders, } = require("../../microserviceClient");
const Response = require("../utilities/response");

// Quest-service admin
async function questHealth(_req, res) {
  try {
    const { data } = await questClient.get("/admin/health");
    return res.status(200).json(new Response(true, 200, "OK", data));
  } catch (err) {
    console.error("questHealth error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Quest health check failed";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

async function questSeed(_req, res) {
  try {
    const { data } = await questClient.post(
      "/admin/seed",
      null,
      withSecretHeaders()
    );
    return res
      .status(200)
      .json(new Response(true, 200, "Seed complete", data));
  } catch (err) {
    console.error("questSeed error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Quest seed failed";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

async function questContent(_req, res) {
  try {
    const { data } = await questClient.get(
      "/admin/content",
      withSecretHeaders()
    );
    return res
      .status(200)
      .json(new Response(true, 200, "Content fetched", data));
  } catch (err) {
    console.error("questContent error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Quest content fetch failed";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

// Card-service admin
async function cardHealth(_req, res) {
  try {
    const { data } = await cardClient.get("/admin/health");
    return res.status(200).json(new Response(true, 200, "OK", data));
  } catch (err) {
    console.error("cardHealth error:", err.message);
    const status = err.response?.status || 500;
    const detail = err.response?.data?.detail || "Card health check failed";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

// Challenge-service admin
async function challengeHealth(_req, res) {
  try {
    const { data } = await challengeClient.get("/admin/health");
    return res.status(200).json(new Response(true, 200, "OK", data));
  } catch (err) {
    console.error("challengeHealth error:", err.message);
    const status = err.response?.status || 500;
    const detail =
      err.response?.data?.detail || "Challenge health check failed";
    return res.status(status).json(new Response(false, status, detail, null));
  }
}

module.exports = {
  questHealth,
  questSeed,
  questContent,
  cardHealth,
  challengeHealth,
};