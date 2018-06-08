var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Time = {
    type: String,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
};

var orderSchema = new Schema({
    "创建时间": {
        type: Date,
        required: true,
    },
    "完成时间": Date,
    "订单状态": {
        type: String,
        enum: [ "完成", "未完成", "取消" ],
        required: true,
        default: "未完成",
    },
    "买家openid": {
        type: String,
        required: true,
    },
    "配送地址": {
        type: {
            "学校": String,
            "宿舍楼": String,
            "宿舍号": String,
            "姓名": String,
            "电话": String,
        },
        required: true,
    },
    "商品条目": [ {
        "商品名": { type: String, required: true },
        "单价": { type: Number, min: 0, required: true },
        "数量": { type: Number, min: 0, required: true },
    }, ],
    "商品总价": { type: Number, min: 0, required: true },
    "运费": { type: Number, min: 0, required: true },
    "起送价": { type: Number, min: 0, required: true },
    "支付金额": { type: Number, min: 0 },
    "备注": { type: String, maxlength: 50 },
    "配送时段": {
        type: {
            "开始时间": Time,
            "结束时间": Time,
        },
        required: true,
    },
    // 一个订单只能使用一张优惠券 或 不使用(则此项为空)
    "优惠券_id": {
        type: Schema.Types.ObjectId,
        required: false,
    },
});

module.exports = orderSchema;