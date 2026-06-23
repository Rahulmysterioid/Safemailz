const express = require('express');
const inviteController = require('../controllers/inviteController');

const router = express.Router();

router.post('/send', inviteController.sendInvite);
router.get('/verify/:token', inviteController.verifyInvite);
router.post('/signup', inviteController.signupInvited);

module.exports = router;
