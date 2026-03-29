/**
 * Routes file for app.js to use, you can add or remove routes from here and it should 
 * work fine following the structure you see here. Add routeCors to any route you want CORS with.
 */

const express = require('express');
const { routeCors } = require('../middleware/cors');
const router = express.Router();
const userController = require('../controllers/userController');

// GET /api/hello -> plain text, CORS activated
router.get('/hello', routeCors, (req, res) => {
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

router.get('/users/:id', routeCors, userController.getUser);

router.post('/users', routeCors, userController.createUser);

module.exports = router;


