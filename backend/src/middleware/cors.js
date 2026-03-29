/**
 * This is a placeholder CORS until the frontend is specified
 */

const cors = require('cors');

// This is random
const FRONTEND_ORIGIN = 'http://localhost:5173';

// Only send CORS headers when testing when the request Origin matches FRONTEND_ORIGIN
const routeCors = cors({
	origin: [FRONTEND_ORIGIN],
	credentials: true,
});

module.exports = {
	routeCors,
	FRONTEND_ORIGIN,
};