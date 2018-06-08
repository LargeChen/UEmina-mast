var mongoose = require('mongoose');

var failMessageSchema = new mongoose.Schema({
    "电话": { type: String, required: true },
    "时间": { type: Date, required: true },
    "内容": { type: String, required: true },
    "详情": { type: String, required: true, default:'无' },
    "已处理": { 
        type: Boolean, 
        default: false,
        required: true 
    },
});

module.exports = failMessageSchema;