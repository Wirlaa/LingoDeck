/**
 * Routes file for app.js to use, you can add or remove routes from here and it should 
 * work fine following the structure you see here.
 */

const express = require('express');
const { routeCors } = require('../middleware/cors');
const { authRequired } = require('../middleware/auth');
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

// This route is protected by our Authorization middleware.
router.get('/users/:id', authRequired, userController.getUser);

router.post('/users', userController.createUser);

router.post('/login', userController.login);

router.get('/token-status', userController.checkTokenStatus);

module.exports = router;


