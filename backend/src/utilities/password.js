/**
 * Simple encryption using bcrypt. It hashes the password and deals with that.
 * 
 * SALT_ROUNDS defines the number of times the algorithm will run,
 * more means a more secure password hash.
 */

const bcrypt = require('bcryptjs');
const config = require('../config/config');

const SALT_ROUNDS = Number(config.auth.salt_rounds) || 10;

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