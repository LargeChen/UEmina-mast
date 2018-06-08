var config = require('../config');
var getThatDay = require('../utils').getThatDay;
var getNextSeveralDay = require('../utils').getNextSeveralDay;
var models = require('../models/models');
var fs =require('fs');

const settingsFilePath = config.settingsFilePath;

var User = models.User;
var Order = models.Order;
var Coupon = models.Coupon;
var CouponType = models.CouponType;
var Product = models.Product;

const userTypes = ["全部用户", "活跃用户", "付费用户", "一般用户", "核心用户", "新增用户", "流失用户"];


// ⽤户定义如下：
//     全部⽤户：  只要在数据库⾥里里有openid就算1个⽤户
//     活跃⽤户：  最近30天内打开过ue鲜果
//     付费⽤户：  最近30天内消费过
//     一般⽤户：  最近7天内消费过，最近8-14天内消费过（例例：如果今天是
//                30号，那就是23-29有消费记录，16-22也有消费记录）
//     核⼼⽤户：  最近7天内消费过最少2次，最近8-14天内消费过最少2次（
//                跟⼀般⽤户的区别在于限制了了2次以上）
//     新增⽤户：  进⼊入ue鲜果的时间在7天内
//     流失⽤户：  上⼀次打开ue鲜果的时间距离今天在31-37天之间。
function checkUserType(user, userType, callback) {
    if (!userTypes.includes(userType) || !(user instanceof User)) throw new Error;

    var now = new Date();
    var SevenDaysAgo = getNextSeveralDay(now, -7);
    var FourteenDaysAgo = getNextSeveralDay(now, -14);
    var ThirtyDaysAgo = getNextSeveralDay(now, -30);
    var ThirtyOneDaysAgo = getNextSeveralDay(now, -31);
    var ThirtySevenDaysAgo = getNextSeveralDay(now, -37);

    if (userType === "全部用户") {
        var result = !user.openid;
        callback(null, result);

    } else if (userType === "活跃用户") {
        var result = user.最近登录时间 ? user.最近登录时间 >= ThirtyDaysAgo : false;
        callback(null, result);

    } else if (userType === "付费用户") {
        Order.find({ _id: { $in: user.历史订单 }, "订单状态": "完成" }, (err, orders) => {
            if (err) callback(err);
            var lastOrderTime = Math.max(...orders.map(x => x.完成时间));
            var result = lastOrderTime >= ThirtyDaysAgo;
            callback(null, result);
        });

    } else if (userType === "一般用户") {
        Order.find({ _id: { $in: user.历史订单 }, "订单状态": "完成" }, (err, orders) => {
            if (err) callback(err);
            var result = orders.map(x => x.完成时间).some(time => time >= SevenDaysAgo) &&
                         orders.map(x => x.完成时间).some(time => time < SevenDaysAgo && time >= FourteenDaysAgo);
            callback(null, result);
        });

    } else if (userType === "核心用户") {
        Order.find({ _id: { $in: user.历史订单 }, "订单状态": "完成" }, (err, orders) => {
            if (err) callback(err);
            var result = (orders.map(x => x.完成时间).filter(time => time >= SevenDaysAgo).length >= 2) &&
                         (orders.map(x => x.完成时间).filter(time => time < SevenDaysAgo && time >= FourteenDaysAgo).length >= 2);
            callback(null, result);
        });

    } else if (userType === "新增用户") {
        var firstLoginTime = user._id.getTimestamp();
        var result = firstLoginTime >= SevenDaysAgo;
        callback(null, result);

    } else if (userType === "流失用户") {
        var result = user.最近登录时间 ? (user.最近登录时间 < ThirtyOneDaysAgo && user.最近登录时间 >= ThirtySevenDaysAgo) : true;
        callback(null, result);

    } else { callback(new Error("无此用户分类")); }
}


function getUsersByUserType(userType, callback) {
    if (!userTypes.includes(userType)) throw new Error;
    User.find((err, users) => {
        if (err) callback(err);
        // get this type users recursively
        var thisTypeUsers = [];
        function findThisTypeUsers(index) {
            if (index >= users.length) {
                callback(null, thisTypeUsers);
                return;
            }
            var user = users[index];
            checkUserType(user, userType, (err, isThisType) => {
                if (err) { callback(err); return; }
                if (isThisType)
                    thisTypeUsers.push(user);
                findThisTypeUsers(index + 1);
            });
        }
        findThisTypeUsers(0);
    })
}

// 判断某用户在购买某些商品若干的情况下是否能用某一张优惠券
// product_list 指涉及的商品对象列表
// cart_list 指包含商品名单价以及数量的购物车内容
// coupon 指用户要使用的某张优惠券
function checkCouponIfIsSatisfiedAllRequirementSync(user_openid, product_list, cart_list, coupon) {
    if (!(product_list.every(p => p instanceof Product)) || !(coupon instanceof Coupon))
        throw new TypeError;
    var result = true;
    // 先判断券本身是否有效
    if (!coupon.isAvailableSync()) result = false;
    // 然后判断用户是否是券的所有者
    if (coupon.归属者openid !== user_openid) result = false;
    // 再具体判断不同类型的券的合法性
    if (coupon.优惠内容.券类型名称 === "满减券") {
        // 判断是否满足价格要求
        var total_amount = cart_list.reduce((acc, item) => { return acc + item['单价'] * item['数量']; }, 0);
        if (total_amount < coupon.优惠内容.价格要求) result = false;
    }
    else if (coupon.优惠内容.券类型名称 === "商品券") {
        // 首先需要判断用户是否有购买相关商品，即商品是否存在于product_list中
        // (Ps: 传入的商品列表product_list表示一定存在的足量的在售商品)
        if (!product_list.map(x => x.商品名).includes(coupon.优惠内容.商品名))
            result = false;
    }
    else if (coupon.优惠内容.券类型名称 === "类目券") {
        // 首先需要判断用户是否有购买相关类目的商品，即券中类目要求是否存在于product_list所涉及的类目中
        if (!product_list.map(x => x.类目).includes(coupon.优惠内容.类目名))
            result = false;
    }
    else {
        throw new Error("优惠内容的类型不属于三种类型之一");
    }
    return result;
}

// 得出优惠了多少钱(元)
function getDiscountSync(cart_list, coupon) {
    if (coupon.优惠内容.券类型名称 === "满减券") {
        return coupon.优惠内容.价格优惠;
    }
    if (coupon.优惠内容.券类型名称 === "商品券") {
        // 先把对应商品筛选出来
        var discount_products_in_cart = cart_list.filter(x => x.商品名 === coupon.优惠内容.商品名);
        // 计算其总价
        var discount_products_amount = discount_products_in_cart.reduce((acc, item) => { return acc + item['单价'] * item['数量']; }, 0);
        // 然后打折扣
        var discount = discount_products_amount * (1 - Math.min(1, coupon.优惠内容.优惠折扣));
        return discount;
    }
    if (coupon.优惠内容.券类型名称 === "类目券") {
        // 先把对应类目的商品筛选出来
        var discount_products_in_cart = cart_list.filter(x => x.类目 === coupon.优惠内容.类目名);
        // 计算其总价
        var discount_products_amount = discount_products_in_cart.reduce((acc, item) => { return acc + item['单价'] * item['数量']; }, 0);
        // 然后打折扣
        var discount = discount_products_amount * (1 - Math.min(1, coupon.优惠内容.优惠折扣));
        return discount;
    }
    throw new Error("优惠内容的类型不属于三种类型之一");
}

// 用于系统自动发放优惠券
function distributeCouponToUsers(users, type, callback) {
    // 不检查相应的优惠券自动发放设置是否是开启状态，这不是它的义务
    var 自动发券设置 = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8')).自动发券设置;

    const 现在 = new Date;
    const 今天 = new Date(getThatDay(现在));
    const 自动发的满减券的生效日期 = 今天;
    
    // 自动发券的都是满减券
    if (自动发券设置[type].价格要求 && 自动发券设置[type].价格优惠 && 自动发券设置[type].得券原因) {
        var 自动发的满减券的失效日期 = getNextSeveralDay(今天, parseInt(自动发券设置[type].有效时长));
        for (var i = 0; i < parseInt(自动发券设置[type].发送数量); i++) {
            users.forEach(user => {
                (new Coupon({
                    "优惠内容": new CouponType.CouponForPriceType({
                        "价格要求": 自动发券设置[type].价格要求,
                        "价格优惠": 自动发券设置[type].价格优惠,
                    }),
                    "自动发券类型": type,
                    "归属者openid": user.openid,
                    "有效期": {
                        "生效日期": 自动发的满减券的生效日期,
                        "失效日期": 自动发的满减券的失效日期,
                    },
                    "得券原因": 自动发券设置[type].得券原因
                })).save((err, coupon) => {
                    if (err) {
                        callback(err);
                        console.log("创建优惠券失败");
                        return;
                    }
                    console.log("生成一张新的优惠券" + coupon._id + "，并发放给了用户" + user.openid);
                    callback(null, coupon);
                });
            });
        }
    }
}

var utils = {
    checkUserType: checkUserType,
    getUsersByUserType: getUsersByUserType,
    checkCouponIfIsSatisfiedAllRequirementSync: checkCouponIfIsSatisfiedAllRequirementSync,
    getDiscountSync: getDiscountSync,
    distributeCouponToUsers: distributeCouponToUsers,
};

module.exports = utils;
