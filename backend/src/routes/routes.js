/**
 * Routes file for app.js to use, you can add or remove routes from here and it should 
 * work fine following the structure you see here.
 */

const express = require('express');

const router = express.Router();

// GET /api/hello -> plain text
router.get('/hello', (req, res) => {
	res.send('Hello dude from /api/hello');
});

// GET /api/status -> JSON status
router.get('/status', (req, res) => {
	res.json({ status: 'I am gucci at ', time: new Date().toISOString() });
});

// POST /api/echo -> echoes JSON body
router.post('/echo', (req, res) => {
	res.json({ youSent: req.body });
});

module.exports = router;


