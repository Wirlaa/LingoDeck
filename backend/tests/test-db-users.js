/**
 * A testing file to test the connection to the database with http requests
 * It now tests:
 *  - Register: POST /api/users
 *  - Login:    POST /api/login
 */

const http = require('http');

const PORT = 3000;
const USERS_PATH = '/api/users';
const LOGIN_PATH = '/api/login';

// Perform HTTP request and parse JSON response
function httpJsonRequest({ method, path, body }) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;

    const options = {
      hostname: 'localhost',
      port: PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';

      res.on('data', (chunk) => {
        raw += chunk;
      });

      res.on('end', () => {
        try {
          const json = raw ? JSON.parse(raw) : null;
          resolve({ statusCode: res.statusCode, body: json });
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(data);
    }
    req.end();
  });
}

async function getUserByIdViaApi(id) {
  console.log(`\nPath: GET /api/users/${id}`);
  const res = await httpJsonRequest({
    method: 'GET',
    path: `${USERS_PATH}/${id}`,
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  if (!res.body || res.body.status !== true || !res.body.data) {
    console.log('Unexpected response wrapper for GET user');
  } else {
    console.log('Custom response wrapper looks gucci for GET user');
  }

  return res;
}

async function registerUserViaApi() {
  console.log('\nPath: POST /api/users (register user)');

  const unique = Date.now();
  const credentials = {
    username: `testboi_${unique}`,
    email: `testboi_${unique}@example.com`,
    password: 'some_plain_password_test',
  };

  const res = await httpJsonRequest({
    method: 'POST',
    path: USERS_PATH,
    body: credentials,
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  if (!res.body || res.body.status !== true || !res.body.data) {
    console.log('Unexpected response wrapper for POST (register) user');
  } else {
    console.log('Custom response wrapper looks OK for POST (register) user');
  }

  const newUser = res.body && res.body.data;
  return { newUser, credentials };
}

async function loginUserViaApi(email, password) {
  console.log('\nPath: POST /api/login (login user)');

  const res = await httpJsonRequest({
    method: 'POST',
    path: LOGIN_PATH,
    body: { email, password },
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  if (!res.body || res.body.status !== true || !res.body.data) {
    console.log('Login did not succeed (as per wrapper status).');
  } else {
    console.log('Custom response wrapper looks OK for POST /api/login');
  }

  return res;
}

async function run() {
  try {
    // 1) (Optional) Fetch an existing user by a specific id (e.g. 1)
    await getUserByIdViaApi(1);

    // 2) Register a new user
    const { newUser, credentials } = await registerUserViaApi();
    if (!newUser || !newUser.id) {
      console.log('New user was not created correctly; skipping login test.');
      return;
    }

    // 3) Login with the same credentials
    await loginUserViaApi(credentials.email, credentials.password);

    // 4) (Optional) Try login with wrong password to see 401
    await loginUserViaApi(credentials.email, 'wrong_password_test');
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    console.log('\nUser API (register + login) tests finished.');
  }
}

run();