const { authClient } = require("../../microserviceClient");
const Response = require("../utilities/response");

// Reuses backend /api/token-status to validate JWT
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader) {
    return res
      .status(401)
      .json(new Response(false, 401, "Missing Authorization header", null));
  }

  try {
    // Call auth backend
    const resp = await authClient.get("/token-status", {
      headers: { Authorization: authHeader },
    });

    // resp.data is your custom Response from the auth backend
    const outer = resp.data; // { status, code, message, data: { valid, expired, user } }

    const valid = outer?.data?.valid;
    const expired = outer?.data?.expired;
    const user = outer?.data?.user;

    if (!valid || expired) {
      return res
        .status(401)
        .json(new Response(false, 401, "Unauthorized", null));
    }

    // Attach user info for later if you want
    req.user = user;
    return next();
  } catch (err) {
    console.error("requireAuth error:", err.message);
    return res
      .status(401)
      .json(new Response(false, 401, "Unauthorized", null));
  }
}

module.exports = { requireAuth };