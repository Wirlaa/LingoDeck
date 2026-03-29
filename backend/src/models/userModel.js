const {pool} = require('../database');


// Return user by id
async function getUserById(id){
    const query = `SELECT id, username, email, created_at, updated_at
     FROM users
     WHERE id = $1 `;
     try{
     const {rows} = await pool.query(query, [id]);
     return rows[0];

    } catch(err){
        console.error('Error getting users by id:', err.message);
        throw err;
    }
}


// Create  the user in db
async function createUser(username, email, password_hash) {
  if (!username || !email || !password_hash) {
    throw new Error('Username, Email and the PasswordHash are required');
  }

  const query = `
    INSERT INTO users (username, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, username, email, created_at, updated_at
  `;

  const values = [username, email, password_hash];

  try {
    const { rows } = await pool.query(query, values);
    return rows[0];
  } catch (err) {
    console.error('Error creating user:', err.message);
    throw err;
  }
}

module.exports = {
    getUserById,
    createUser
}