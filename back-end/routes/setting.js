var express = require('express');
var router = express.Router();
var config = require('../config');
var settingsFilePath = config.settingsFilePath;
var fs = require('fs');

// 设置页
router.route('/')
// 显示设置列表
.get((req, res, next) => {
    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    res.render('setting', { settings: settings });
})
// 修改设置
.post((req, res, next) => {
    var dirty = false;

    if (req.body['用户口令']) {
        var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        settings['加密口令'] = req.body['用户口令'];
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
        console.log('更新用户口令成功');
        // 清除cookie
        res.clearCookie(config.cookieKeyName);
        dirty = true;
    }

    if (req.body['营业时间']) {
        var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
        var startTime = req.body['营业时间']['开始时间'] || 
                        settings['营业时间']['开始时间'];
        var endTime   = req.body['营业时间']['结束时间'] || 
                        settings['营业时间']['结束时间'];
        if (startTime < endTime) {
            settings['营业时间']['开始时间'] = startTime;
            settings['营业时间']['结束时间'] = endTime;
            fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
            console.log('更新营业时间成功');
            dirty = true;
        }
    }

    if (dirty)
        res.json({ ok: true });
    else
        res.json({ ok: false, code: 10, codeName: '请求body未携带待修改设置信息'});
});

module.exports = router;
