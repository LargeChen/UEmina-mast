const mkdirp = require('mkdirp');
const fs = require('fs');
const config = require('./config');
const request = require('request');
const crypto = require('crypto');

const sha1 = require('sha1');
const md5 = require('md5');

const utils = {
    getCookieValue: () => (new Date()).toDateString(),
    promiseDirExists: (dir) => {
        if (!fs.existsSync(dir)) {
            mkdirp(dir, (err) => {
                if (err) console.error(err);
                else console.log('创建文件夹' + dir);
            });
        }
    },
    promiseFileExists: (file, content) => {
        if (!fs.existsSync(file)) fs.writeFileSync(file, content);
    },
    fsRename: (oldPath, newPath, callback) => {
        var is = fs.createReadStream(oldPath)
        var os = fs.createWriteStream(newPath);
        is.pipe(os);
        is.on('end', function () {
            fs.unlinkSync(oldPath);
            callback.apply(this, arguments);
        });
    },
    // 通过code得到{ openid: ..., session_key: ... }
    getUserSession: (code, callback) => {
        // 它要code注入点什么的话那我也无fuck可说
        var jscodeToSessionApi = 'https://api.weixin.qq.com/sns/jscode2session?appid=' + config.appId +
            '&secret=' + config.appSecret +
            '&js_code=' + code +
            '&grant_type=authorization_code';
        console.log(jscodeToSessionApi);
        var options = {
            url: jscodeToSessionApi,
            headers: {
                'User-Agent': 'request'
            }
        };

        request(options, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                var info = JSON.parse(body);
                console.log(info);
                callback(error, info);
            } else {
                console.log(error);
            }
        });
    },
    encrypt: function (text) {
        return sha1(md5(text));
    },
    md5: function (text) {
        return crypto.createHash('md5').update(text).digest('hex');
    },
    randomString: function (n) {
        n = n || 31;
        // 以下实现来自 http://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        for (let i = 0; i < n; i++)
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        return text;
    },
    // 获取客户端IP
    getClientIp: function (req) {
        // 实现来自 http://www.cnblogs.com/whitewolf/p/3572724.html
        return req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
    },
    toValidPhoneNumberOrNull: function (phone) {
        if (typeof (phone) !== "string")
            return null;
        var digits = phone.match(/\d/g) || [];
        var digit_count = digits.length;
        if (digit_count == 11)
            return digits.join('');
        if (digit_count == 13 && phone.match(/^\s*\+86/g)) // +86 xxxxxxxxxxx
            return digits.slice(2, 13).join(''); // 取后11位
        return null; // 电话不合法
    },
    fillMessageTemplate: function (template, ...packings) {
        for (let i = 0; template.includes("%s"); i++) {
            template = template.replace("%s", packings[i] || "");
        }
        return template;
    },
    // 当天凌晨整点
    getThatDay: function (time) {
        if (!(time instanceof Date))
            throw new TypeError;
        return new Date((new Date(time)).setUTCHours(0, 0, 0, 0));
    },
    // 几天后，n可以为负数
    getNextSeveralDay: function (time, n) {
        if (!(time instanceof Date) || !Number.isInteger(n)) {
            console.error(time);
            console.error(n);
            throw new TypeError;
        }
        let thatDay = new Date(time);
        thatDay.setDate(time.getDate() + n);
        return thatDay;
    },
    getDayDifference: function (data1, data2) {
        if (!(data1 instanceof Date) || !(data2 instanceof Date))
            throw new TypeError;
        return Math.abs(Math.floor((date2 - date1) / (1000 * 60 * 60 * 24)));
    },
    // 2012-12-21
    dateToyyyyMMddString: function (date) {
        if (!(date instanceof Date))
            throw new TypeError;
        return date.toISOString().slice(0, 10);
    },
    // 11:02
    dateToHHMMString: function (date) {
        if (!(date instanceof Date))
            throw new TypeError;
        return date.toTimeString().slice(0, 5);
    },
    isValidDate: function (date) {
        // An invalid date object returns NaN for getTime() and NaN is the only
        // object not strictly equal to itself.
        return date.getTime() === date.getTime();
    },
    isInvalidDate: function (date) {
        return date.getTime() !== date.getTime();
    },
    getBuildingGender: function (school, building) {
        let idx = school.宿舍楼.indexOf(building);
        console.log("idx is " + idx);
        if (idx === -1) {
            // throw new Error("%s不存在此宿舍楼%s", school, building);
            return "无相关信息";
        } 
        return school.宿舍楼性别[idx];
    },
    // reference: https://stackoverflow.com/questions/6452021/getting-timestamp-from-mongodb-id
    convertObjectIdToTimestamp: function (_id) {
        let timestamp = _id.toString().substring(0, 8);
        return timestamp;
    },
    convertObjectIdToDate: function (_id) {
        let timestamp = _id.toString().substring(0, 8);
        let date = new Date(parseInt(timestamp, 16) * 1000)
        return date;
    }
};

module.exports = utils;
