const dotenv = require('dotenv');

// Load variables from .env into process.env, overriding any existing values
dotenv.config({ override: true });

const config = {
	port: process.env.PORT || 3000,
	nodeEnv: process.env.NODE_ENV || 'development',
	db: {
		host: process.env.DB_HOST || 'localhost',
		port: Number(process.env.DB_PORT) || 5432,
		user: process.env.DB_USER || 'user',
		password: process.env.DB_PASSWORD || 'password',
		name: process.env.DB_NAME || 'projectdb',
		salt_rounds: process.env.SALT_ROUNDS || 10 // Default to 10 if no SALT_ROUNDS set
	}
	
};

console.log('Loaded PORT from env:', process.env.PORT);
console.log('Config port:', config.port);
console.log('DB config:', config.db);

module.exports = config;

