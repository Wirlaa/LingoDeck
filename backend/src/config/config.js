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
		
	},
	auth: {
		salt_rounds: Number(process.env.SALT_ROUNDS) || 10, // Default to 10 if no SALT_ROUNDS set
		jwtSecret: process.env.JWT_SECRET || 'placeholder_dev_jwt_key',
		jwtExpiration: process.env.JWT_EXPIRATION || '30m' // Expire after 30mins by default.


	}
	
};

console.log('Loaded PORT from env:', process.env.PORT);
console.log('Config port:', config.port);
console.log('DB config: (Delete this for final build, it is in config.js)', config.db);

module.exports = config;

