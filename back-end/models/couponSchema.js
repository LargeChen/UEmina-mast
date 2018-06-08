var mongoose = require('mongoose');
var utils = require('../utils');
var Schema = mongoose.Schema;

// 满减券
var CouponForPriceType = new Schema({
    "券类型名称": { type: String, default: "满减券", required: true, enum: [ "满减券" ]},
    "价格要求": { type: Number, required: true, min: 0 }, // 单位：元
    "价格优惠": { type: Number, required: true, min: 0 }, // 单位：元
});

// 商品券
var CouponForFruitType = new Schema({
    "券类型名称": { type: String, default: "商品券", required: true, enum: [ "商品券" ]},
    "商品名": { type: String, required: true },
    "优惠折扣": { type: Number, required: true, min: 0, max: 1 },
});

// 类目券
var CouponForCategoryType = new Schema({
    "券类型名称": { type: String, default: "类目券", required: true, enum: [ "类目券" ]},
    "类目名": { type: String, required: true },
    "优惠折扣": { type: Number, required: true, min: 0, max: 1 },
});

CouponForPriceType = mongoose.model('CouponForPriceType', CouponForPriceType);
CouponForFruitType = mongoose.model('CouponForFruitType', CouponForFruitType);
CouponForCategoryType = mongoose.model('CouponForCategoryType', CouponForCategoryType);


var couponSchema = new Schema({
    "状态": {
        type: String,
        required: true,
        default: "全新",
        enum: ["全新", "已用", "撕毁"]
    },
    "已曝光": {
        type: Boolean,
        required: true,
        default: false,
    },
    "优惠内容": {
        type: Schema.Types.Mixed,
        required: true,
        validate: {
            validator: function(v) {
                if (typeof(v.validateSync) === 'function') {
                    var error = v.validateSync();
                    if (error) {
                        console.error(error);
                        return false;
                    }
                }
                var result =  (v.券类型名称 === "满减券") || 
                              (v.券类型名称 === "商品券") || 
                              (v.券类型名称 === "类目券");
                if (!result) {
                    console.error('{VALUE} 不属于 满减券、商品券 或 类目券 中的一种!');
                }
                return result;
            },
        },
    },
    // 当此值为空时则为管理员手动发券
    "自动发券类型": {
        type: String,
        required: false,
        enum: [ 
            "七天满减", 
            "十四天满减", 
            "三十天满减", 
            "新用户满减", 
            "舍友满减", 
            "首次付费满减"
        ],
    },
    "归属者openid": {
        type: String, // openid
        required: false, // 可无主
    },
    "有效期": {
        type: {
            "生效日期": { type: Date, required: true }, // 当天零点
            "失效日期": { type: Date, required: true }, // 当天零点
        },
        required: true
    },
    "得券原因": {
        type: String, 
        required: false, // 券无主时则不需要
    }
});

// 判断券本身效力是否存在，跟什么用户使用以及怎么使用无关
// 失效：当券被用 / 未在使用期内（早于生效日期，晚于或等于失效日期）/ 被撕毁
couponSchema.methods.isAvailableSync = function() {
    var 今天 = utils.getThatDay(new Date);
    return ((this.状态 !== "撕毁" && this.状态 !== "已用") &&
            (this.有效期.生效日期.getTime() <= 今天.getTime() && this.有效期.失效日期.getTime() > 今天.getTime()));
}

// 未生效
couponSchema.methods.hasNotReachedValidityTimeSync = function() {
    var 今天 = utils.getThatDay(new Date);
    return (this.状态 !== "撕毁" && this.状态 !== "已用" && this.有效期.失效日期.getTime() > 今天.getTime());
}

couponSchema.methods.isAvailable = function(callback) {
    callback(null, this.isAvailableSync());
}

couponSchema.methods.getNameSync = function() {
    if (this.优惠内容.券类型名称 === "满减券")
        return "满" + this.优惠内容.价格要求 + "减" + this.优惠内容.价格优惠;
    if (this.优惠内容.券类型名称 === "商品券")
        return "买" + this.优惠内容.商品名 + "打" + (this.优惠内容.优惠折扣 * 10).toFixed(2) + "折";
    if (this.优惠内容.券类型名称 === "类目券")
        return "买" + this.优惠内容.类目名 + "打" + (this.优惠内容.优惠折扣 * 10).toFixed(2) + "折";
    throw new Error;
};

module.exports = {
    couponSchema: couponSchema,
    CouponType: {
        CouponForPriceType: CouponForPriceType,
        CouponForFruitType: CouponForFruitType,
        CouponForCategoryType: CouponForCategoryType,
    }
};