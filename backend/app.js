const express = require('express');
const config = require('./src/config/config');

const app = express();

const port = config.port;

app.get('/', (req, res) => {
  res.send('Hello World');  
});

app.post('/submit-form', (req, res) => {
  res.send('Form submitted');
}); 

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);  
});
