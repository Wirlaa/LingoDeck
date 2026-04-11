/**
 * Contains SQL queries for getting a user by id and creating a new one.
 */

const {pool} = require('../utilities/database');
const hash = require('../utilities/password');


// Return user by id
async function getUserById(id){
    const query = `SELECT id, username, email, created_at, updated_at
     FROM users
     WHERE id = $1 `;
     try{
     const {rows} = await pool.query(query, [id]);
     return rows[0];

    } catch(err){
        console.error('Error getting user by id:', err.message);
        throw err;
    }
}

// Get user by Email, used by Login endpoints
async function getUserByEmail(email){
  const query = `
  SELECT id, username, password_hash, created_at, updated_at
  FROM users
  WHERE email = $1
  `;

  try {
    const { rows } = await pool.query(query, [email]);
    return rows[0];
  } catch (err) {
    console.error('Error getting user by email', err.message);
    throw err;

  }

}


// Create  the user in db, used by register endpoints
async function createUser(username, email, password) {
  if (!username || !email || !password) {
    throw new Error('Username, Email and the Password are required');
  }


  const query = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at, updated_at
  `;

  try {
    const password_hash = await hash.hashPassword(password);
    const values = [username, email, password_hash];
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}



module.exports = {
    getUserById,
    getUserByEmail,
    createUser
}