const dotenv = require("dotenv");
dotenv.config({ override: true });

const config = {
	port: process.env.PORT || 4000,
	services: {
		quest: process.env.QUEST_SERVICE_URL || "http://my-stack_quest:8001",
		card: process.env.CARD_SERVICE_URL || "http://my-stack_card:8002",
		challenge: process.env.CHALLENGE_SERVICE_URL || "http://my-stack_challenge:8003",
		auth: process.env.AUTH_SERVICE_URL || "http://my-stack_auth:3000/api",
		}
	
};

module.exports = config;