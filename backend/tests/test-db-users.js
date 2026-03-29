// A simple test file that connects to the users api.

const http = require('http');

const PORT = 3000;
const BASE_PATH = '/api/users';

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
    path: `${BASE_PATH}/${id}`,
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  // Checks against your custom Response shape
  if (!res.body || res.body.status !== true || !res.body.data) {
    console.log('Unexpected response wrapper for GET user');
  } else {
    console.log('Custom response wrapper looks gucci for GET user');
  }

  return res;
}

async function createUserViaApi() {
  console.log('\nPath: POST /api/users (create user)');

  const unique = Date.now();
  const body = {
    username: `testboi_${unique}`,
    email: `testboi_${unique}@example.com`,
    password_hash: 'some_hash_value_needs_JWT',
  };

  const res = await httpJsonRequest({
    method: 'POST',
    path: BASE_PATH,
    body,
  });

  console.log('Status:', res.statusCode);
  console.log('Response JSON:', JSON.stringify(res.body, null, 2));

  // Checks against your custom Response shape
  if (!res.body || res.body.status !== true || !res.body.data) {
    console.log('Unexpected response wrapper for POST user');
  } else {
    console.log('Custom response wrapper looks OK for POST user');
  }

  const newUser = res.body && res.body.data;
  return newUser;
}

async function run() {
  try {
    // 1) Fetch an existing user by a specific id (e.g. 1)
    await getUserByIdViaApi(1);

    // 2) Create a new user
    const createdUser = await createUserViaApi();
    if (!createdUser || !createdUser.id) {
      console.log('New user was not created correctly; skipping fetch-by-id for new user.');
      return;
    }

    // 3) Fetch the newly created user by id
    await getUserByIdViaApi(createdUser.id);
  } catch (err) {
    console.error('Test error:', err.message);
  } finally {
    console.log('\nUser API tests finished.');
  }
}

run();