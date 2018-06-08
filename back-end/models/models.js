var mongoose = require('mongoose');

var config = require('../config');

var userSchema = require('./userSchema');
var productSchema = require('./productSchema');
var orderSchema = require('./orderSchema');
var categorySchema = require('./categorySchema');
var schoolSchema = require('./schoolSchema');
var failMessageSchema = require('./failMessageSchema');
var noticeKeySchema = require('./noticeKeySchema');
var couponSchema = require('./couponSchema').couponSchema;

var CouponType = require('./couponSchema').CouponType;
var CouponForPriceType = CouponType.CouponForPriceType;
var CouponForFruitType = CouponType.CouponForFruitType;

mongoose.connect(
    'mongodb://' + config.databaseHost + ':' + config.databasePort + '/' + config.databaseName,
    { useMongoClient: true });

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Suceess to connect the database');
});

var models = {
    User: mongoose.model('User', userSchema),
    Product: mongoose.model('Product', productSchema),
    Order: mongoose.model('Order', orderSchema),
    Category: mongoose.model('Category', categorySchema),
    School: mongoose.model('School', schoolSchema),
    Coupon: mongoose.model('Coupon', couponSchema),
    CouponType: CouponType,
    FailMessage: mongoose.model('FailMessage', failMessageSchema),
    NoticeKey: mongoose.model('NoticeKey', noticeKeySchema),
};

module.exports = models;

// ------------------- Debug 使用 -----------------------
// var utils = require('../routes/utils');
// var Coupon = models.Coupon;
// var CouponForPriceType = models.CouponType.CouponForPriceType;
// var CouponForFruitType = models.CouponType.CouponForFruitType;
// var CouponForCategoryType = models.CouponType.CouponForCategoryType;

// var now = new Date();
// var ThreeDaysLater = new Date((new Date(now)).setDate(now.getDate() + 3));
// var SevenDaysAgo = new Date((new Date(now)).setDate(now.getDate() - 7));

// var newCoupon = new Coupon({
//     "优惠内容": new CouponForFruitType({
//         "商品名": "苹果",
//         "优惠折扣": 0.9,
//     }),
//     "有效期": {
//         "生效日期": SevenDaysAgo,
//         "失效日期": ThreeDaysLater,
//     }
// });

// newCoupon.save((err) => {
//     if (err) console.log(err);
//     else console.log('成功录入订单');
// });

// console.log("同步查询是否可用：", newCoupon.isAvailableSync());
// newCoupon.isAvailable((err, available) => console.log("异步查询是否可用：", available));

// var User = models.User;
// var now = new Date();
// var ThreeDaysAgo = new Date((new Date(now)).setDate(now.getDate() - 3));

// var user = new User({
//     "openid": "123456789",
//     "历史订单": [],
//     "最近登录时间": ThreeDaysAgo,
// });

// user.save((err) => {
//     if (err) throw err;
//     console.log("新增用户成功");
// });

// var utils = require('../routes/utils');
// utils.getUsersByUserType("一般用户", (err, users) => {
//     if (err) throw err;
//     console.log(users.length);
// });