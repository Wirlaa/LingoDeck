const dotenv = require("dotenv");
dotenv.config({ override: true });

const config = {
	port: process.env.PORT || 4000,
	services: {
		quest: process.env.QUEST_SERVICE_URL || "http://localhost:8001",
        card: process.env.CARD_SERVICE_URL || "http://localhost:8002",
        challenge: process.env.CHALLENGE_SERVICE_URL || "http://localhost:8003",
		auth: process.env.AUTH_SERVICE_URL || "http://localhost:3000/api",
        sharedSecret: process.env.SERVICE_SHARED_SECRET || "dev_secret",
		}
	
};

module.exports = config;