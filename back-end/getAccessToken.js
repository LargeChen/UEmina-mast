var request = require('request');
var config = require('./config');

var last_time, access_token;

var access_token_url = 'https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential';
access_token_url += '&appid=' + config.appId;
access_token_url += '&secret=' + config.appSecret;
console.log(access_token_url);
// var option = {
//     appid: config.appId,
//     secret: config.appSecret,
//     grant_type: "client_credential",
// }

function almostExpired() {
    if(!last_time) {
        return true;
    }
    var delta_time = (new Date()).getTime() - last_time.getTime();
    return delta_time / 1000 / 60 > 30; // if greater than 30min
}

// 暴露出去的接口
function getAccessToken() {
    return access_token;
}

function updateAccessToken() {
    console.log("更新access token...");
    if (!access_token || almostExpired()) {
        // 要获取新的access_token
        request.get(access_token_url, (err, res, body) => {
            if (err) {
                console.log('获取access token出错！');
                console.log(err);
            }
            console.log(body);
            last_time = new Date();
            access_token = JSON.parse(body).access_token;
            console.log("更新成功！");
        });
    }
}

module.exports = {
    getAccessToken: getAccessToken,
    updateAccessToken: updateAccessToken
}