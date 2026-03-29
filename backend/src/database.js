/**
 * Simple database connection to postgre.
 */

const config = require('./config/config');
const {Pool} = require('pg');

const pool = new Pool(
    {
        host: config.db.host,
        port: config.db.port,
        user: config.db.user,
        password: config.db.password,
        database: config.db.name

    }
)


module.exports = {pool};