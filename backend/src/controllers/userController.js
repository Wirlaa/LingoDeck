const { getUserById, createUser: createUserModel, getUserByEmail } = require('../models/userModel');
const { comparePassword } = require('../utilities/password');
const { signJWToken, verifyJWToken } = require('../utilities/jwt');
const { extractBearerToken } = require('../utilities/authHeader');
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

    // If the user does not exist, return a status code 404 error wrapped with the customer response class.
    if (!user) {
      return res
        .status(404)
        .json(new Response(false, 404, 'User not found', null)); // Custom response sent from the backend.
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
  const { username, email, password } = req.body || {};
  const normalizedPassword = String(password || "");
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/; // Pattern check for email

  if (!username || !normalizedEmail || !normalizedPassword) {
    return res
      .status(400)
      .json(
        new Response(
          false,
          400,
          'username, email and password fields are required fields',
          null
        )
      );
  }

  if (!emailPattern.test(normalizedEmail)) {
    return res
      .status(400)
      .json(new Response(false, 400, 'Invalid email format', null));
  }

  if (normalizedPassword.length < 6) {
    return res
      .status(400)
      .json(new Response(false, 400, 'Password must be at least 6 characters long', null));
  }

  try {
    const newUser = await createUserModel(
      username,
      normalizedEmail,
      normalizedPassword,
    
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
          new Response(false, 409, 'Username or email already exists in the database', null)
        );
    }

    return res
      .status(500)
      .json(new Response(false, 500, 'Failed to create user', null));
  }
}

// Path: POST /api/login
async function login(req,res) {
  const {email, password} = req.body || {};
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPassword = String(password || '');
  const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

  if (!normalizedEmail || !normalizedPassword)
    return res
      .status(400)
      .json(
        new Response(false, 400, 'Email and Password are required fields', null)
      );
  
  if (!emailPattern.test(normalizedEmail)) {
    return res
      .status(400)
      .json(new Response(false, 400, 'Invalid email format', null));
  }

  if (normalizedPassword.length < 6) {
    return res
      .status(400)
      .json(new Response(false, 400, 'Password must be at least 6 characters long', null));
  }
  
  try {
    const user = await getUserByEmail(normalizedEmail);

    if (!user) {
      return res
        .status(401)
        .json(
          new Response(false, 401, 'User not found', null)
        );
    }
    const passwordOk = await comparePassword(normalizedPassword, user.password_hash);
    if (!passwordOk) {
      return res
        .status(401)
        .json(new Response(false, 401, 'Invalid user credentials', null));

    }

    const { password_hash, ...safeUser } = user;

    const payload = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    const jwToken = signJWToken(payload);

    const responseData = {
      user: safeUser,
      jwToken,
    };

    return res
      .status(200)
      .json(new Response(true, 200, 'Login successful', responseData));

  } catch (err) {
    console.error('Controller login error:', err.message);
    return res
      .status(500)
      .json(new Response(false, 500, 'User login failed', null));

  }
}

// Path: GET /api/token-status
// Checks the JWT status and returns it.
function checkTokenStatus(req, res) {
  const { ok, token, errorMessage } = extractBearerToken(req);

  if (!ok) {
    return res
      .status(400)
      .json(new Response(false, 400, errorMessage, null));
  }

  const { valid, expired, decoded } = verifyJWToken(token);

  const message = valid ? 'Token is valid' : expired ? 'Token has expired' : 'Token is invalid';

  const data = {
    valid,
    expired,
    user: valid ? decoded : null,
  };

  return res
    .status(200)
    .json(new Response(true, 200, message, data));

}

module.exports = {
  getUser,
  createUser,
  login,
  checkTokenStatus
};