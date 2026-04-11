/**
 * This module might be a little bit complicated, so I will try to explain it.
 * What we are doing here is to ensure any protected path requires
 * the JWT Token to be sent over from the client to avoid unauthorized
 * access from some random dude accessing it. 
 * 
 * It reads the authorization HTTP header sent to it, and then it checks if
 * it is in the Authorization: Bearer <token> format (this needs to be sent to the backend).
 * 
 * It then verifies the JWT token using a function. If it succeeds
 * it attaches the decoded JWT payload(data) to the req.user and continues the request
 * otherwise it will stop the request and return a 401 error
 * to the frontend.
 * 
 * TLDR: Avoids unauthorized access to routes that need it. 
 * Send Authorization: Bearer <Token> header from the frontend if you want to access any path that uses this.
 */

const { verifyJWToken } = require('../utilities/jwt')
const { extractBearerToken } = require('../utilities/authHeader');
const Response = require('../utilities/response');

// Next passes control to the next middleware/handler, used to stop/continue execution
function authRequired(req, res, next) {

    // Use the shared helper to extract the bearer token, how this works is explained in the comments at top.
    const { ok, token, errorMessage } = extractBearerToken(req);
    if (!ok) {
    return res
      .status(401)
      .json(new Response(false, 401, errorMessage, null));
  }

    // For verification of the JWT
    const {valid, expired, decoded} = verifyJWToken(token);
    

    if (!valid) {
        const message = expired ? 'Token expired' : 'Invalid token'; // Check to see if token is expired, if not the token was invalid.
        return res
            .status(401)
            .json(new Response(false, 401, message, null));
    }
    req.user = decoded; // Decoded payload request, eg {id, username,email etc...}
    next();

}

module.exports = {
    authRequired,
};