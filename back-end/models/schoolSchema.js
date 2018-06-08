var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var Time = {
    type: String,
    match: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    default: '08:00',
};

var schoolSchema = new Schema({
    "学校名": { type: String, unique: true, required: true },
    "起送价": { type: Number, min: 0, default: 0 },
    "运费": { type: Number, min: 0, default: 0 },
    "宿舍楼": [ String ],
    "宿舍楼性别": [ { type: String, enum: [ "男", "女", "未知" ], default: "未知" } ],
    "交易时段": [ {
        "配送时段": {
            "开始时间": Time,
            "结束时间": Time,
        },
        "下单时段": {
            "开始时间": Time,
            "结束时间": Time,
        },
    }, ],
    // 一个学校一台打印机
    "打印机信息": {
        "SN码": { type: String, required: true },
        "KEY": { type: String, required: true },
    },
    // 每个学校不同客服
    "客服": {
        "电话": { type: String, required: true },
        "微信": { type: String, required: true },
    },
});

module.exports = schoolSchema;
