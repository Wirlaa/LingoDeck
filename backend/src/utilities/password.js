const bcrypt = require('bcryptjs');
const config = require('../config/config');

const SALT_ROUNDS = Number(config.db.salt_rounds) || 10;

async function hashPassword(password) {
    if (!password)
        throw new Error('Password is missing');

    const hash = await bcrypt.hash(password, SALT_ROUNDS);
    return hash;
}

async function comparePassword(plainPassword, hashedPassword) {
    if (!plainPassword || !hashedPassword)
        return false;

    const match = await bcrypt.compare(plainPassword, hashedPassword);
    return match;
}

module.exports = {
    hashPassword,
    comparePassword
};