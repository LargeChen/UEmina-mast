// Done

var express = require('express');
var router = express.Router();

var config = require('../config');

router.get('/', (req, res, next) => {
    res.clearCookie(config.cookieKeyName);
    res.redirect('/');
});

module.exports = router;
