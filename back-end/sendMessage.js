var request = require('request');
var urlencode = require('urlencode');
var config = require('./config');
var models = require('./models/models');

var FailMessage = models.FailMessage;

function saveFailMessage(phone, content, detail=null) {
    var fm = new FailMessage({
        "电话": phone,
        "时间": new Date(),
        "内容": content,
        "详情": detail
    });
    fm.save((err) => {
        if (err) {
            console.log('连插入出错短信都出错了');
            console.log(err);
            return;
        }
        // console.log('保存出错短信成功');
    });
}

function sendMessage(phone, content, service, callback) {
    if (!phone || !content)
        throw new Error('缺少参数phone或content');

    if(typeof service === "function") {
        callback = service;
        sendMessageByYunPian(phone, content, callback);
    } else if(service === "yunpian") {
        sendMessageByYunPian(phone, content, callback);
    } else if(service === "diyi") {
        throw new Error('已经弃用diyi信息');
        sendMessageByDiYi(phone, content, callback);
    } else {
        // throw new Error('未知的service: ' + service);
        console.log('未知的service: ' + service);
        sendMessageByYunPian(phone, content, callback);
    }
}

function sendMessageByDiYi(phone, content, callback) {
    var form = {
        name: config.textMessageAcount,
        pwd: config.textMessagePwd,
        content: content,
        mobile: phone,
        sign: config.textMessageSign,
        type: 'pt'
    };

    request.post({
        url: config.textMessageUrl,
        form: form,
    }, (err, httpRespone, body) => {
        if (err) {
            console.log("单发短信发送失败, " + phone + err);
            saveFailMessage(phone, content, "diyi fail");
            return false;
        }
        // console.log(body);
        typeof callback === "function" && callback();
    });
}

// 使用云片接口发送默认短信（有些人的名字被屏蔽了）
var default_template = '同学，您的水果已经到了，请在15分钟内下楼领取，水果有任何问题请联系客服哦。短信由系统发出，请勿回复。';
function sendDefaultMessageByYunPian(phone, callback) {
    var form = {
        apikey: config.textMessageYunPianApikey,
        mobile: phone,
        text: default_template,
    }

    request.post({
        url: config.textMessageYunPianUrl,
        form: form,
    }, (err, httpRespone, body) => {
        if (err) {
            console.log("单发短信发送失败, " + phone + err);
            saveFailMessage(phone, default_template, err);
            return false;
        }
        body = JSON.parse(body);
        if (body.code != 0) {
            console.log("单发短信发送失败, " + phone + body.detail);
            saveFailMessage(phone, default_template, body.detail);
        }
        // console.log(body);
        typeof callback === "function" && callback();
    });
}

// 用营销号发短信
function sendMessageByYunPianYingXiao(phone, content, callback) {
    // 因为有两个账号，要再发一次
    var form = {
        apikey: config.textMessageYunPianApikey_yinxiao,
        mobile: phone,
        text: content,
    }

    request.post({
        url: config.textMessageYunPianUrl,
        form: form,
    }, (err, httpRespone, body) => {
        if (err) {
            console.log("单发短信发送失败, " + phone + err);
            saveFailMessage(phone, content, err);
            return false;
        }
        // console.log(body);
        typeof callback === "function" && callback();
    });
}

// 使用云片接口发送短信
function sendMessageByYunPian(phone, content, callback) {
    // 如果不是发水果到达短信
    if (!content.includes('您的水果已经到了')) {
        sendMessageByYunPianYingXiao(phone, content, callback);
        return false;
    }

    var form = {
        apikey: config.textMessageYunPianApikey,
        mobile: phone,
        text: content,
    }

    request.post({
        url: config.textMessageYunPianUrl,
        form: form,
    }, (err, httpRespone, body) => {
        if (err) {
            console.log("单发短信发送失败, " + phone + err);
            saveFailMessage(phone, content, err);
            return false;
        }
        // 检查发送状态
        body = JSON.parse(body);
        // 说明出问题了
        if (body.code != 0) {
            // 屏蔽词
            if (body.code===4) {
                // 那就不发姓名
                sendDefaultMessageByYunPian(phone, callback);
                return false;
            }
            // 模板不对
            if(body.code === 5) {
                // emmmmmm，难道说要脏起来？
                // 用营销号再发一次
                sendMessageByYunPianYingXiao(phone, content, callback);
                return false;
            }
            // 未知原因
            console.log("单发短信发送失败, " + phone + body.detail);
            saveFailMessage(phone, default_template, body.detail);
            return false;
        }
        typeof callback === "function" && callback();
    });

}


function sendMultiMessage(phones_list, content, callback) {
    if (!phones_list || !content) {
        throw new Error('缺少参数phones_list或content');
    }
    
    // 云片的要求
    if(content[0] != '【') {
        content = '【UE鲜果】' + content;
    }

    // console.log("准备发送短信内容：" + content);
    
    // 准备去重
    console.log("准备去重" + phones_list.length + "条自动短信");
    phone_list = [...new Set(phones_list)];
    console.log("准备发送" + phones_list.length + "条自动短信");

    var form = {
        apikey: config.textMessageYunPianApikey_yinxiao,
        mobile: phones_list.join(','),
        text: content,
    }

    request.post({
        url: config.textMessageYunPianUrl_batch,
        form: form,
    }, (err, httpRespone, body) => {
        if (err) {
            console.log("群短信发送失败, " + phones_list + err);
            saveFailMessage(''+phones_list, content, err);
            return false;
        }
        // console.log('群发短信结果');
        // console.log(body);
        body = JSON.parse(body);
        body.data.forEach(result => {
            if(result.code != 0) {
                saveFailMessage(result.mobile, content, result.msg);
            }
        });
        typeof callback === "function" && callback();
    });

    // var form = {
    //     name: config.textMessageAcount,
    //     pwd: config.textMessagePwd,
    //     content: content,
    //     mobile: phones_list.join(','),
    //     sign: config.textMessageSign,
    //     type: 'pt'
    // };

    // request.post({
    //     url: config.textMessageUrl,
    //     form: form,
    // }, (err, httpRespone, body) => {
    //     if (err) {
    //         console.log("群发短信发送失败, " + phones_list + err);
    //         saveFailMessage(phones_list.join(), content);
    //         return false;
    //     }
    //     console.log(body);
    //     typeof callback === "function" && callback();
    // });
}

module.exports = {
    sendMessage: sendMessage,
    sendMultiMessage: sendMultiMessage,
};
