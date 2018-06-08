var request = require('request');
var config = require('./config');
var models = require('./models/models');
var ObjectID = require('mongodb').ObjectID;
var getNextSeveralDay = require('./utils').getNextSeveralDay;
var getAccessToken = require('./getAccessToken').getAccessToken;

var NoticeKey = models.NoticeKey;

// 把时间转换为objectId字符串
// https://github.com/SteveRidout/mongo-object-time
var objectIdFromDate = function (date) {
    return Math.floor(date.getTime() / 1000).toString(16) + "0000000000000000";
};

// 发送微信通知的接口
// openid: 目标用户的openid
// template_id: 消息模板的id
// page: 跳转的目标page
// notice_key: 就是formId或prepayId
// data: 消息内容
// color: 文本颜色，不填为黑色
// emphasis_keyword: 高亮的文字
function sendWxNotice(openid, template_id, page, data, color, emphasis_keyword) {
    var today = new Date();
    var expired_date = getNextSeveralDay(today, -7); // prepay_id有效期7天
    var expired_object_id = objectIdFromDate(expired_date);
    // 判断一下该openid还有没有可以用的
    NoticeKey.find({ 买家openid: openid, 状态: '生效', _id: { $gte: ObjectID(expired_object_id)} }, (err, keys) => {
        if (err) {
            console.log("查询NK出错");
            console.log(err);
            return false;
        }
        if (keys.length === 0) {
            console.log("用户" + openid + "没有可用NK，取消发送");
            return false;
        }
        // 就是这个key
        var notice_key = keys[0].key;

        var access_token = getAccessToken();
        var notice_url = 'https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token=' + access_token;
        var form = {
            "touser": openid,
            "template_id": template_id,
            "page": page,
            "form_id": notice_key,
            "data": data
        }
        var option = {
            uri: notice_url,
            method: 'POST',
            json: form
        }

        console.log("准备发送微信notice给用户" + openid);
        request(option, (err, httpRespone, body) => {
            if (err) {
                console.log("发送微信notice失败");
                console.log(err);
                return;
            }
            console.log("发送微信notice成功，返回值如下");
            console.log(body);
            // body = JSON.parse(body);
            // 模板key过期
            if (body.errcode != 0){
                console.log(new Date() + " " + notice_key + " 竟然又过期了！不可理喻！");
            }
        });

        console.log("准备让"+notice_key+"的状态变成失效");
        keys[0].状态 = '失效';
        keys[0].save((err) => {
            if(err) {
                console.log("变失效失败了！");
                console.log(err);
            }
        });
        return true;
    });
}

// 准备发送订单到达通知
const 订单到达模板ID = 'jgDXErzHqTiJW1oS_THdvqK6eJ13lNjvmqMysfIJpRg';
const 订单到达page = 'pages/index/index';
const 订单到达内容 = '水果送到，请尽快领取！\n水果有任何问题找客服小U哦~';

function sendOrderNotice(openid, order_time, order_address, order_content) {
    var data = {
        keyword1: {
            value: order_time
        },
        keyword2: {
            value: order_content
        },
        keyword3: {
            value: order_address
        },
        keyword4: {
            value: 订单到达内容
        },
    };
    sendWxNotice(openid, 订单到达模板ID, 订单到达page, data);
}

// 发送优惠券到期的通知
const 果券到期模板ID = 'ydaLbHVREcI5nAYxWDZOaFq8lJN8RaCgAadlo0bQBA0';
const 果券到期page = 'pages/index/index';
const 果券到期内容 = '明天是有效期最后一天，请及时使用！'

function sendCouponNotice(openid, coupon_content, coupon_date) {
    var data = {
        keyword1: {
            value: coupon_content
        },
        keyword2: {
            value: coupon_date
        },
        keyword3: {
            value: 果券到期内容
        }
    }
    sendWxNotice(openid, 果券到期模板ID, 果券到期page, data);
}

module.exports = {
    sendWxNotice: sendWxNotice,
    sendOrderNotice: sendOrderNotice,
    sendCouponNotice: sendCouponNotice,
};