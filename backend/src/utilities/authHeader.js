/**
 * Utility to extract a Bearer token from the Authorization header.
 * It reads the authorization HTTP header sent to it, and then it checks if
 * it is in the Authorization: Bearer <token> format (this needs to be sent to the backend).
 * Returns a small object so callers can decide their separate status codes.
 */

function extractBearerToken(req) {
  const authHeader = req.headers['authorization'] || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return {
      ok: false,
      token: null,
      errorMessage: 'Authorization header is missing or incorrect',
    };
  }

  return {
    ok: true,
    token,
    errorMessage: null,
  };
}

module.exports = {
  extractBearerToken,
};