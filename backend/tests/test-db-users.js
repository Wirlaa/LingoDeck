/**
 * A testing file to test the connection to the database with http requests.
 * It now tests:
 *  - Register:            POST /api/users
 *  - Login (JWT):         POST /api/login
 *  - Protected GET:       GET  /api/users/:id with and without JWT
 *  - Token status check:  GET  /api/token-status with JWT
 */

const http = require('http');

const PORT = 3000;
const USERS_PATH = '/api/users';
const LOGIN_PATH = '/api/login';
const TOKEN_STATUS_PATH = '/api/token-status';

// Perform HTTP request and parse JSON response
function httpJsonRequest({ method, path, body, headers = {} }) {
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
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let rawData = '';

      res.on('data', (chunk) => {
        rawData += chunk;
      });

      res.on('end', () => {
        let parsed;
        if (rawData.length > 0) {
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            console.error('Failed to parse JSON response:', e.message);
          }
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
        });
      });
    });

    req.on('error', (err) => {
      console.error('HTTP request failed:', err.message);
      reject(err);
    });

    if (data) {
      req.write(data);
    }

    req.end();
  });
}

async function getUserByIdViaApi(id, token) {
  console.log(`\nPath: GET /api/users/${id}`);
  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await httpJsonRequest({
    method: 'GET',
    path: `${USERS_PATH}/${id}`,
    headers,
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  if (!res.body) {
    console.error('No JSON body returned from GET /api/users/:id');
  } else {
    console.log('Custom response wrapper looks OK for GET /api/users/:id');
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
    console.error('Unexpected response structure from POST /api/users');
  } else {
    console.log('Custom response wrapper looks OK for POST /api/users');
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
    console.error('Unexpected response structure from POST /api/login');
  } else {
    console.log('Custom response wrapper looks OK for POST /api/login');
  }

  const token = res.body.data && res.body.data.jwToken;
  if (!token) {
    console.error('No jwToken returned from /api/login');
  } else {
    console.log('Received jwToken of length:', token.length);
  }

  return { res, token };
}

async function checkTokenStatusViaApi(token) {
  console.log('\nPath: GET /api/token-status (check token status)');

  const headers = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const res = await httpJsonRequest({
    method: 'GET',
    path: TOKEN_STATUS_PATH,
    headers,
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  return res;
}

async function run() {
  try {
    console.log('--- Starting DB + JWT + token-status test ---');

    // 1) Register a new user
    const { newUser, credentials } = await registerUserViaApi();
    if (!newUser || !newUser.id) {
      console.error('Registration did not return a valid user id, aborting.');
      return;
    }
    console.log('Registered user id:', newUser.id);

    // 2) Login to get JWT
    const { token } = await loginUserViaApi(credentials.email, credentials.password);
    if (!token) {
      console.error('Login did not return a valid token, aborting.');
      return;
    }

    // 3) Try protected GET without token (should fail with 401)
    const resNoToken = await getUserByIdViaApi(newUser.id, null);
    if (resNoToken.statusCode === 401) {
      console.log('As expected, GET /api/users/:id without token returned 401.');
    } else {
      console.error(
        'Unexpected status for GET /api/users/:id without token. Expected 401, got',
        resNoToken.statusCode
      );
    }

    // 4) Try protected GET with token (should succeed)
    const resWithToken = await getUserByIdViaApi(newUser.id, token);
    if (resWithToken.statusCode === 200 && resWithToken.body && resWithToken.body.status === true) {
      console.log('GET /api/users/:id with valid token succeeded as expected.');
    } else {
      console.error(
        'Unexpected status/body for GET /api/users/:id with token. Status:',
        resWithToken.statusCode
      );
    }

    // 5) Check token status endpoint
    const statusRes = await checkTokenStatusViaApi(token);
    if (
      statusRes.statusCode === 200 &&
      statusRes.body &&
      statusRes.body.data &&
      statusRes.body.data.valid === true
    ) {
      console.log('/api/token-status reports token is valid as expected.');
    } else {
      console.error('Unexpected response from /api/token-status');
    }

    console.log('--- Test run finished ---');
  } catch (err) {
    console.error('Test run failed with error:', err.message);
  } finally {
    process.exit(0);
  }
}

run();