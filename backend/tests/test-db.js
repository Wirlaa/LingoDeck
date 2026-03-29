// This is obsolete, I just left it for now. It just prints all users. 

const {pool} = require('../src/database');

async function printAllUsers(){
    try {
        console.log('Running Postgre database test');
        let testString = "SELECT id, username, email, first_name, last_name FROM users"
        console.log(`test SQL query: ${testString}`);

        
        const result = await pool.query('SELECT id, username, email, first_name, last_name FROM users');

        console.log(JSON.stringify(result.rows, null, 2));
    }
    catch(err) {
        console.error('Error querying users:', err.message);

    }
    finally {
        await pool.end();
        process.exit(0);
    }
}
printAllUsers();