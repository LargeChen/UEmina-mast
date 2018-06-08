const schedule = require('node-schedule');
const fs = require('fs');

const utils = require("./utils");

const models = require("./models/models");
const config = require("./config");
const sendMessage = require("./sendMessage").sendMessage;
const sendMultiMessage = require("./sendMessage").sendMultiMessage;

const fillMessageTemplate = require("./utils").fillMessageTemplate;
const convertObjectIdToDate = require("./utils").convertObjectIdToDate;
const isValidDate = require("./utils").isValidDate;

const distributeCouponToUsers = require('./routes/utils').distributeCouponToUsers;
const checkUserType = require("./routes/utils").checkUserType;
const settingsFilePath = config.settingsFilePath;

const UPDATE_USER_TYPE__HOUR = config.UPDATE_USER_TYPE__HOUR;
const UPDATE_USER_TYPE__MINUTE = config.UPDATE_USER_TYPE__MINUTE;

const AUTO_DISTRIBUTE_COUPON__HOUR = config.AUTO_DISTRIBUTE_COUPON__HOUR;
const AUTO_DISTRIBUTE_COUPON__MINUTE = config.AUTO_DISTRIBUTE_COUPON__MINUTE;

const Order = models.Order;
const User = models.User;
const School = models.School;
const Coupon = models.Coupon;

const updateAccessToken = require('./getAccessToken').updateAccessToken;

var sendCouponNotice = require('./sendWxNotice').sendCouponNotice;


function updateAllUsersType() {

    const typesWillBeCheck = ["活跃用户", "付费用户", "一般用户", "核心用户", "新增用户", "流失用户"];

    // check if user is these types recursively
    function updateUserType(user, callback, index = 0, userTypes = []) {
        if (index >= typesWillBeCheck.length) {
            // end up the check, update it
            user.用户类型 = userTypes;
            user.save((err, user) => {
                if (err) throw err;
                console.log("更新用户" + user.openid + "的用户类型为：" + user.用户类型);
                typeof callback === "function" && callback();
            });
            // end up the recur
            return;
        }

        var userType = typesWillBeCheck[index];
        checkUserType(user, userType, (err, isThisType) => {
            if (err) throw err;
            if (isThisType)
                userTypes.push(userType);
            updateUserType(user, callback, index + 1, userTypes);
        });
    }

    function updateUsersType(users, callback, index = 0) {
        if (index >= users.length) {
            // end up the recur
            typeof callback === "function" && callback();
            return;
        }
        var user = users[index];
        updateUserType(user, (err) => {
            if (err) throw err;
            updateUsersType(users, callback, index + 1);
        });
    }

    User.find((err, users) => {
        if (err) throw err;
        updateUsersType(users, (err) => {
            if (err) throw err;
            console.log("[END] 所有用户的用户类型更新完成！");
        });
    });
}

// 对每一个用户，如果上一次消费距离现在7天、14天、30天都会发送不同的满减券，每天
// 早上11点定时发送，这3张满减券的配置项管理员可以更改，这3个券需要短信通知
function autoDistributeCoupons() {
    const 自动发券设置 = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8')).自动发券设置;
    const 自动发放七天满减已开启 = 自动发券设置 && 自动发券设置.七天满减 && 自动发券设置.七天满减.开启;
    const 自动发放十四天满减已开启 = 自动发券设置 && 自动发券设置.十四天满减 && 自动发券设置.十四天满减;
    const 自动发放三十天满减已开启 = 自动发券设置 && 自动发券设置.三十天满减 && 自动发券设置.三十天满减.开启;

    const today = new Date((new Date).setUTCHours(0, 0, 0, 0));
    const SevenDaysAgo = new Date((new Date(today)).setDate(today.getDate() - 7));
    const FourteenDaysAgo = new Date((new Date(today)).setDate(today.getDate() - 14));
    const ThirtyDaysAgo = new Date((new Date(today)).setDate(today.getDate() - 30));
    const ThirtyOneDaysAgo = new Date((new Date(today)).setDate(today.getDate() - 31));
    // 我认为上一次消费在这几天的都起码在31内有登录过才能做到消费，以此筛选掉一部分人
    User.find({ $where: "this['历史订单'].length > 0", "最近登录时间": { $gte: ThirtyOneDaysAgo } }, (err, users) => {
        console.log("查到的用户数量是", users.length);
        if (err) throw err;
        var 七天短信通知列表 = [];
        var 十四天短信通知列表 = [];
        var 三十天短信通知列表 = [];

        var 七天短信模板 = undefined;
        var 十四天短信模板 = undefined;
        var 三十天短信模板 = undefined;

        var count = 0; // 用来防止异步bug
        users.forEach((user) => {
            Order.find({ "_id": { $in: user.历史订单 }, "订单状态": "完成" }, (err, orders) => {
                if (err || !orders) throw err;
                if (orders.length === 0) return;

                var 上一次消费的订单的完成时间戳 = Math.max(...orders.map(o => o.完成时间));
                var 上一次消费的订单 = orders.find(o => (o.完成时间.getTime() === 上一次消费的订单的完成时间戳));
                var 上一次消费的消费日 = new Date(new Date(上一次消费的订单.完成时间).setUTCHours(0, 0, 0, 0));

                var 在七天前那天有消费 = 上一次消费的消费日.getTime() === SevenDaysAgo.getTime();
                var 在十四天前那天有消费 = 上一次消费的消费日.getTime() === FourteenDaysAgo.getTime();
                var 在三十天前那天有消费 = 上一次消费的消费日.getTime() === ThirtyDaysAgo.getTime();

                // 自动发放七天满减券
                if (自动发放七天满减已开启 && 在七天前那天有消费) {
                    distributeCouponToUsers([user], "七天满减", (err, coupon) => {
                        if (err) {
                            console.log("自动发 七天满减 失败", err);
                            return;
                        }
                        console.log("成功为用户发 七天满减", coupon._id);
                        if (user.地址 && user.地址.电话) {
                            console.log("七天券通知：添加 " + user.地址.电话);
                            七天短信通知列表.push(user.地址.电话);
                            if (七天短信模板 === undefined) {
                                七天短信模板 = fillMessageTemplate(config.自动发七天满减券短信提醒内容模板, coupon.getNameSync());
                            }
                            // sendMessage(user.地址.电话, fillMessageTemplate(config.自动发七天满减券短信提醒内容模板, coupon.getNameSync())); // 自动发短信提醒
                        } else {
                            console.log("七天自动券通知：无地址或电话");
                        }
                    });
                }
                // 自动发放十四天满减券
                if (自动发放十四天满减已开启 && 在十四天前那天有消费) {
                    distributeCouponToUsers([user], "十四天满减", (err, coupon) => {
                        if (err) {
                            console.log("自动发 十四天满减 失败", err);
                            return;
                        }
                        console.log("成功为用户发 十四天满减", coupon._id);
                        if (user.地址 && user.地址.电话) {
                            console.log("十四天券通知：添加 " + user.地址.电话);
                            十四天短信通知列表.push(user.地址.电话);
                            if (十四天短信模板 === undefined) {
                                十四天短信模板 = fillMessageTemplate(config.自动发十四天满减券短信提醒内容模板, coupon.getNameSync());
                            }
                            // sendMessage(user.地址.电话, fillMessageTemplate(config.自动发十四天满减券短信提醒内容模板, coupon.getNameSync())); // 自动发短信提醒
                        } else {
                            console.log("十四天自动券通知：无地址或电话");
                        }
                    });
                }
                // 自动发放三十天满减券
                if (自动发放三十天满减已开启 && 在三十天前那天有消费) {
                    distributeCouponToUsers([user], "三十天满减", (err, coupon) => {
                        if (err) {
                            console.log("自动发 三十天满减 失败", err);
                            return;
                        }
                        console.log("成功为用户发 三十天满减", coupon._id);
                        if (user.地址 && user.地址.电话) {
                            console.log("三十天券通知：添加 " + user.地址.电话);
                            三十天短信通知列表.push(user.地址.电话);
                            if (三十天短信模板 === undefined) {
                                三十天短信模板 = fillMessageTemplate(config.自动发三十天满减券短信提醒内容模板, coupon.getNameSync());
                            }
                            // sendMessage(user.地址.电话, fillMessageTemplate(config.自动发三十天满减券短信提醒内容模板, coupon.getNameSync())); // 自动发短信提醒
                        }
                    });
                }

                count++; // 希望上面的函数都是sync的
            });
        });
        while (count != users.length) {
            require('deasync').sleep(100); // 不会疯狂轮询堵住进程，只会卡住这个函数
        }
        if (七天短信通知列表.length > 0) {
            console.log("发送七天短信给 " + 七天短信通知列表.length + "名用户，内容为：" + 七天短信模板);
            sendMultiMessage(七天短信通知列表, 七天短信模板);
        }
        if (十四天短信通知列表.length > 0) {
            console.log("发送十四天短信给 " + 十四天短信通知列表.length + "名用户，内容为：" + 十四天短信模板);
            sendMultiMessage(十四天短信通知列表, 十四天短信模板);
        }
        if (三十天短信通知列表.length > 0) {
            console.log("发送三十天短信给 " + 三十天短信通知列表.length + "名用户，内容为：" + 三十天短信模板);
            sendMultiMessage(三十天短信通知列表, 三十天短信模板);
        }
    });
}

// 因为schema做了修改 所以要增加这一项
function addOpenidToOrders() {
    User.find((err, users) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log("准备更新" + users.length + "个用户的相关订单");

        users.forEach(user => {
            Order.find({ "_id": { $in: user.历史订单 }, "买家openid": { $exists: false } }, (err, orders) => {
                orders.forEach(order => {
                    order.买家openid = user.openid;
                    order.save((err) => {
                        if (err) throw err;
                        console.log("为订单" + order._id + "插入买家openid成功");
                    });
                })
            });
        });
    });
}

function cleanInvalidFormatCoupons() {
    Coupon.deleteMany({ $or: [{ "有效期.生效日期": { $exists: false } }, { "有效期.失效日期": { $exists: false } }] }).exec((err, result) => {
        if (err) throw err;
        result = JSON.parse(result);
        if (result.ok)
            console.log("成功找到了" + result.n + "个无效的优惠券 删掉");
        else
            console.log("找到无效的优惠券失败了，MongoDB说", result);
    });
}

function ensureDormGenderExist() {
    School.find((err, schools) => {
        if (err) throw err;
        schools.forEach(school => {
            let hasChanged = false;
            if (!school.客服.电话) {
                school.客服.电话 = "15521216538";
                hasChanged = true;
            }
            if (!school.客服.微信) {
                school.客服.微信 = "uefruit_";
                hasChanged = true;
            }
            if (!school.打印机信息.KEY) {
                school.打印机信息.KEY = "5b9aygm3";
                hasChanged = true;
            }
            if (!school.打印机信息.SN码) {
                school.打印机信息.SN码 = "917504082";
                hasChanged = true;
            }
            if (!Array.isArray(school.宿舍楼性别) || school.宿舍楼.length !== school.宿舍楼性别) {
                for (let i = 0; i < school.宿舍楼.length; i++) {
                    if (school.宿舍楼性别[i] !== "男" && school.宿舍楼性别[i] !== "女" && school.宿舍楼性别[i] !== "未知") {
                        school.宿舍楼性别[i] = "未知";
                        hasChanged = true;
                    }
                }
            }
            if (hasChanged) {
                school.save((err) => {
                    if (err) throw err;
                    console.log("为学校" + school.学校名 + "确保了合法的宿舍楼性别");
                });
            }
        });
    });
}

// 删除无地址信息（无订单）的旧用户
function removeVeryOldUser() {
    User.find({ "地址": { $exists: false } }, (err, users) => {
        if (err) throw err;
        console.log("找到%s个有订单的用户", users.length);
        users.forEach(user => {
            let createdTime = convertObjectIdToDate(user._id);
            if (createdTime < new Date("2017-04-11")) {
                user.remove((err, user) => {
                    if (err) {
                        console.log("删除旧用户失败");
                        throw err;
                    }
                    console.log("成功删除旧用户", user.openid);
                });
            }
        });
    });
}

// 大四的毕业了，所以他们的宿舍不再合法了，清一波
// 输入{ "中大": [ "至一", "至四" ], "广中医": ["1号楼"] }
function cleanNotAliveGraduateAddress(graduate_dorms, date_base) {
    let 基准日期 = date_base ? new Date(date_base) : new Date;
    if (utils.isInvalidDate(基准日期)) 基准日期 = new Date;

    for (let 学校 in graduate_dorms) {
        User.find({ "地址.学校": 学校 }, (err, users) => {
            if (err) console.log(err);
            users.forEach(这同学 => {
                Order.find({ "买家openid": 这同学.openid, "完成时间": { $gt: 基准日期 } }, (err, orders) => {
                    if (err) throw err;
                    if (orders.length === 0) {
                        School.findOne({ "学校名": 学校 }, (err, school) => {
                            let 此学校宿舍名列表 = graduate_dorms[学校];
                            if (Array.isArray(此学校宿舍名列表) && 此学校宿舍名列表.length === 0) {
                                此学校宿舍名列表 = school.宿舍楼;
                            }
                            let 这同学毕业了 = 此学校宿舍名列表.includes(这同学.地址.宿舍楼);
                            if (这同学毕业了) {
                                这同学.地址.学校 = undefined;
                                这同学.地址.宿舍楼 = undefined;
                                这同学.地址.宿舍号 = undefined;
                                这同学.save((err) => {
                                    if (err) throw err;
                                    console.log("成功地删除了用户%s (%s)的宿舍地址", 这同学.地址.姓名, 这同学.openid);
                                });
                            }
                        });
                    }
                });
            });
        });
    }
}

function ensureLastLoginTimeExist() {
    User.find({ "最近登录时间": { $exists: false } }, (err, users) => {
        if (err) throw err;
        console.log("找到%s个待更新`最近登录时间`字段的用户", users.length);
        users.forEach(user => {
            console.log("准备更新的用户为", user);
            user.最近登录时间 = convertObjectIdToDate(user._id);
            if (utils.isInvalidDate(user.最近登录时间)) throw new Error("ObjectId转换成的时间有误");
            user.save((err) => {
                if (err) throw err;
                console.log("成功更新用户%s的最近登录时间为%s", user.openid, user.最近登录时间);
            });
        });
    });
}

// 一次性的，为了保证mongodb里的数据存在且正常
function schemaChange() {
    // 将买家openid加到订单里
    // addOpenidToOrders();

    // 加入`宿舍楼性别`字段，对应每一个宿舍楼，即保证长度与`宿舍楼`字段长度一致
    ensureDormGenderExist();

    // 有历史遗留的无效字段
    cleanInvalidFormatCoupons();

    // 删除4月11号前创建的用户，一般那些都是测试用的，废弃了应该
    removeVeryOldUser();

    // 之前在userSchema里新增的`最近登录时间`字段，保证它的存在
    ensureLastLoginTimeExist();
}

// 返回一个日期字符串，时间为23:59
function dateToStringAtDayEnd(d) {
    var res = '';
    res += d.getFullYear() + '年';
    res += (d.getMonth() + 1) + '月';
    res += d.getDate() + '日';
    res += ' 23:59';
    return res;
}

// 自动提示优惠券即将过期的情况
function autoNoticeCouponExpired() {
    console.log("开始检查有没有快过期的果券要提醒");
    // 获取后天零点的时间
    const today = new Date((new Date).setUTCHours(0, 0, 0, 0));

    var theDayAfterTomorrow = utils.getThatDay(new Date((new Date).setDate(today.getDate() + 2)));

    var tomorrow = new Date(new Date(today).setDate(today.getDate() + 1));
    var expiredDate = new Date(tomorrow.setHours(23, 59, 0, 0));
    // var dateStringOptions = { year: 'numeric', month: 'long', day: 'numeric', minute: 'numeric', hour: 'numeric', hour12: false };
    var expiredDateString = dateToStringAtDayEnd(expiredDate);
    
    Coupon.find({"有效期.失效日期": theDayAfterTomorrow}).exec((err, coupons) => {
        if(err) {
            console.log("查询coupon数据库出错");
            console.log(err);
            return false;
        }
        var openid_hash = {}; // 假装是hash
        coupons.forEach((coupon) => {
            // 找到了一个果券，应该有个hash set记录已发送的用户
            if (openid_hash[coupon.归属者openid] != undefined) {
                return;
            }
            // 开始准备要发送的东西：优惠券内容，
            var coupon_content = coupon.getNameSync();
            console.log(coupon_content);
            sendCouponNotice(coupon.归属者openid, coupon_content, expiredDateString);
            openid_hash[coupon.归属者openid] = true;
        });
    });
}

module.exports = {
    run: function () {
        console.log("启动每日任务...");

        // 1
        console.log("每日任务一：在 " + UPDATE_USER_TYPE__HOUR + ":" + UPDATE_USER_TYPE__MINUTE +
            " 的时候更新数据库中每个用户的用户类型（一个用户有多种类型）...");
        schedule.scheduleJob({ hour: UPDATE_USER_TYPE__HOUR, minute: UPDATE_USER_TYPE__MINUTE },
            updateAllUsersType);
        console.log("启动成功");

        // 2
        console.log("每日任务二：在 " + AUTO_DISTRIBUTE_COUPON__HOUR + ":" + AUTO_DISTRIBUTE_COUPON__MINUTE +
            " 的时候按设置自动发放相关满减券...");
        schedule.scheduleJob({ hour: AUTO_DISTRIBUTE_COUPON__HOUR, minute: AUTO_DISTRIBUTE_COUPON__MINUTE },
            autoDistributeCoupons);
        console.log("启动成功");

        // 3
        console.log("每隔20分钟更新一下access token...")
        schedule.scheduleJob("0 0,20,40 * * * *", (fireDate) => {
            updateAccessToken();
        });
        console.log("启动成功");

        // 4
        console.log("每日任务三：在11：00的时候发送优惠券过期提醒...");
        schedule.scheduleJob({ hour: 11, minute: 0 }, autoNoticeCouponExpired);
        console.log("启动成功");

        // 先更新一下access token
        updateAccessToken();

        // 测试一下coupon过期提醒
        // autoNoticeCouponExpired();

        // 当schema有修改的时候
        // schemaChange();

        // 大四毕业了所以
        // cleanNotAliveGraduateAddress({ "中山大学": [] }, "2017-08-21"); // 先试一下空空的会不会报错
    }
};
