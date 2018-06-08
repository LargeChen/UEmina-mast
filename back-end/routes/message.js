var express = require('express');
var router = express.Router();

var models = require('../models/models');
var FailMessage = models.FailMessage;

var sendMessage = require('../sendMessage.js').sendMessage;


router.route('/')
.get((req, res, next) => {
    FailMessage.find().sort({'已处理': 1, '_id': -1}).exec((err, messages) => {
        if(err) {
            console.log(err);
            res.send('数据库查询出错');
            return;
        }
        res.render('failMessage', {messages: messages});
    });
});


router.route('/set_done')
.post((req, res, next) => {
    if(!req.body['_id'] || !req.body['已处理']) {
        res.json({ok: false, messages: "参数错误"});
        return;
    }
    FailMessage.update({_id: req.body['_id']}, {'已处理': req.body['已处理']}, (err) => {
        if(err) {
            console.log("更新状态失败");
            res.json({ok: false});
        }
        res.json({ok: true});
    });
});

router.route('/resend')
.get((req, res, next) => {
    FailMessage.find({"已处理": false}).exec((err, messages) => {
        if(err) {
            console.log("重发短信查询数据库失败");
            res.json({ ok: false });
            return ;
        }

        if(messages.length > 1) {
            res.json({ ok: false, message: "debug" });
            return false;
        }

        messages.forEach((message)=>{
            // 重发
            // sendMessage(message.电话, message.内容);
            console.log(message._id, message.电话, message.内容);
            // 更新状态
            FailMessage.findByIdAndUpdate(message._id, {"已处理": true}, (err, res) => {
                if(err) {
                    console.log("更新单个失败", err);
                }
                console.log(res);
            });
        });

        res.json({ok: true});
    });
});

module.exports = router;