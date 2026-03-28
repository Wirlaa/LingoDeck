const dotenv = require('dotenv');

// Load variables from .env into process.env, overriding any existing values
dotenv.config({ override: true });

const config = {
	port: process.env.PORT || 3000,
	nodeEnv: process.env.NODE_ENV || 'development',
};

console.log('Loaded PORT from env:', process.env.PORT);
console.log('Config port:', config.port);

module.exports = config;

