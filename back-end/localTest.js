var sendMessage = require('./sendMessage');

sendMessage.sendMessage('15521149569',
        '李煜政同学，您的水果已经到了，请在15分钟内下楼领取，水果有任何问题请联系客服哦。短信由系统发出，请勿回复。',
        'yunpian',
    function() {
        console.log('发送请求成功！');
    });
