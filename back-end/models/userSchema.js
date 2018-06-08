var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var ObjectId = Schema.ObjectId;

var userSchema = new Schema({
    "openid": { type: String, unique: true, required: true },
    "地址": {
        "学校": String,
        "宿舍楼": String,
        "宿舍号": String,
        "姓名": String,
        "电话": String
    },
    "历史订单": [ Schema.Types.ObjectId ],
    "最近登录时间": { type: Date, required: true }, // 若等于创建时间则为二次开发前登录过后再无登录
    // 一个用户包含多个用户类型，每天凌晨0时整更新维护一次
    "用户类型": [{
        type: String, 
        // 所有用户都有一个默认存在的用户类型为 全部用户 因为都有openid，我也不知道为什么会有这个需求
        required: false, 
        enum: [ "活跃用户", "付费用户", "一般用户", "核心用户", "新增用户", "流失用户" ],
    }],
    "备用地址": {
        "学校": String,
        "宿舍楼": String,
        "宿舍号": String,
        "姓名": String,
        "电话": String
    },
});

module.exports = userSchema;