var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//用来存用于发送微信通知的key
var noticeKeySchema = new Schema({
    "状态": {
        type: String,
        enum: [ "生效", "未生效", "失效" ],
        required: true,
        default: "未生效",
    },
    "买家openid": {
        type: String,
        required: true,
    },
    "订单id": {
        type: String,
        required: true,
    },
    "key": {
        type: String,
        required: true,
    },
    "类型": {
        type: String,
        enum: ["支付", "表单"],
        required: true,
    }
});

module.exports = noticeKeySchema;