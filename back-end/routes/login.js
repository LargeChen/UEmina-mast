var express = require('express');
var config = require('../config');
var utils = require('../utils');
var settingsFilePath = config.settingsFilePath;
var fs = require('fs');

var router = express.Router();

router.route('/')
    .get((req, res, next) => {
        // 已登录就进入首页
        req.isAuthorized ? res.redirect('/') : res.render('login');
    })
    .post((req, res, next) => {
        var encryptedPassword = req.body['encryptedPassword'];
        if (!encryptedPassword) {
            res.json({ ok: false, code: 2, codeName: '请求body未携带加密口令参数' });
            console.log('请求body未携带加密口令参数');
            return;
        }
        var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        if (settings['加密口令'] !== encryptedPassword) {
            res.json({ ok: false, code: 1, codeName: '口令错误' });
            console.log('登录失败');
            return;
        }
        // 取当天的日期的字符串作为value
        res.cookie(config.cookieKeyName, utils.getCookieValue(), { signed: true });
        res.json({ ok: true });
        console.log('登录成功');
    });

module.exports = router;
