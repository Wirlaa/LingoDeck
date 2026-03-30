/**
 * Simple JWT Token generator.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

const JWT_SECRET = config.auth.jwtSecret;
const JWT_EXPIRATION = config.auth.jwtExpiration;

function signJWToken(payload, options = {}) {
    // Allows overriding expiresIn if required
    const signOptions = {
        expiresIn: JWT_EXPIRATION, ...options // This little guy(...options) is responsible for overriding the timeout if needed
    };

    return jwt.sign(payload, JWT_SECRET, signOptions);
}

function verifyJWToken(token){
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        return { 
            valid: true,
            expired: false,
            decoded,
            error: null
        };
    } catch (err) {
        console.log('JWT Token verification failed', err.message);
        return {
            valid: false,
            expired: err.name === 'TokenExpiredError',
            decoded: null,
            error: err,
        };

    }

}

module.exports = {
    signJWToken,
    verifyJWToken
}