var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var FilePath = String;

var productSchema = new Schema({
    "商品名": {
        type: String, 
        unique: true, 
        required: true,
        minlength: 1,
        maxlength: 30,
    },
    "权重": {
        type: Number, // 整数 用于显示排序
        min: 1,
        default: 1,
        required: true,
    },
    "每日特惠": {
        type: Boolean, 
        default: false,
        required: true,
    },
    "在售": {
        type: Boolean, 
        default: true,
        required: true,
    },
    "单价": {
        type: Number, // 单位为 元
        min: 0,
        required: true,
    },
    "库存": {
        type: Number,
        min: 0,
        default: 0,
        required: true,
    },
    "类目": String, // 类目名称
    "规格": [ { "属性名称": String, "属性值": String } ],
    "详情图": [ FilePath ], // 图片在服务器中的存放地址
    "标签": { 
        type: String, 
        enum: [ "新", "荐", "爆", "无" ],
        required: true,
        default: "无",
    },
    "缩略图": [ FilePath ], // 图片在服务器中的存放地址
    "导购语": String,
    "重置开关": {
        type: Boolean,
        default: false,
        required: true,
    },
    "默认库存": {
        type: Number,
        min: 0,
        default: 0,
        required: true,
    },
});

module.exports = productSchema;