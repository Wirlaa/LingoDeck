/**
 * A simple CORS test I wrote, basically takes two different URLs,
 * the first one is allowed through CORS while the second one is not.
 * Then, it runs the test with the hostname, the port and the endpoint method.
 * 
 */

const http = require('http');

const PORT = 3000;
const PATH = '/api/hello';

// Origins to test: first is the allowed placeholder defined in the cors.js file, second is a disallowed one
const originsToTest = [
  'http://localhost:5173',
  'http://LUT.com',
];

function testOrigin(origin) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: PATH,
      method: 'GET',
      headers: {
        Origin: origin,
      },
    };

    const req = http.request(options, (res) => {
      const allowedOrigin = res.headers['access-control-allow-origin'];
      const isAllowed = allowedOrigin === origin;

      console.log('-Testing CORS-');
      console.log('Origin:          ', origin);
      console.log('Response Allow-Origin:   ', allowedOrigin || '(none)');
      console.log('CORS OK for this origin: ', isAllowed);
      console.log('');

      resolve(isAllowed);
    });

    req.on('error', (err) => {
      console.error('Request failed for:', origin, err.message);
      reject(err);
    });

    req.end();
  });
}

async function runTest() {
  for (const origin of originsToTest) {
    try {
      await testOrigin(origin);
    } catch (e) {
      
    }
  }

  console.log('CORS tests finished.');
}

runTest();
