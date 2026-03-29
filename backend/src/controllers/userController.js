const { getUserById, createUser: createUserModel } = require('../models/userModel');
const Response = require('../utilities/response');

// Path: GET /api/users/:id
async function getUser(req, res) {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res
      .status(400)
      .json(new Response(false, 400, 'Invalid User Id', null));
  }

  try {
    const user = await getUserById(id);

    if (!user) {
      return res
        .status(404)
        .json(new Response(false, 404, 'User not found', null));
    }

    return res
      .status(200)
      .json(new Response(true, 200, 'User fetched successfully', user));
  } catch (err) {
    console.error('Controller getUser error:', err.message);
    return res
      .status(500)
      .json(new Response(false, 500, 'Failed to fetch user', null));
  }
}

// Path: POST /api/users
async function createUser(req, res) {
  const { username, email, password_hash } = req.body || {};

  if (!username || !email || !password_hash) {
    return res
      .status(400)
      .json(
        new Response(
          false,
          400,
          'username, email and password_hash are required',
          null
        )
      );
  }

  try {
    const newUser = await createUserModel(
      username,
      email,
      password_hash,
    
    );

    return res
      .status(201)
      .json(new Response(true, 201, 'User created successfully', newUser));
  } catch (err) {
    console.error('Controller createUser error:', err.message);

    if (err.code === '23505') {
      return res
        .status(409)
        .json(
          new Response(false, 409, 'Username or email already exists', null)
        );
    }

    return res
      .status(500)
      .json(new Response(false, 500, 'Failed to create user', null));
  }
}

module.exports = {
  getUser,
  createUser,
};