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

async function testConnectionToDB(){
    let test = 'SELECT NOW() AS now';
    const result = await pool.query(test);
    return result.rows[0].now; 
}

module.exports = {pool, testConnectionToDB};