var express = require('express');
var router = express.Router();
var http = require('http');
var qs = require('querystring');
var request = require('request');

var config = require('../config');
var sendMessage = require('../sendMessage').sendMessage;
var sendMultiMessage = require('../sendMessage').sendMultiMessage;
var printOrder = require('../printOrder');
var settingsFilePath = config.settingsFilePath;
var fs = require('fs');

var models = require('../models/models');
var config = require('../config');
var utils = require('../utils');

var Coupon = models.Coupon;
var CouponType = models.CouponType;
var School = models.School;
var Category = models.Category;
var User = models.User;


// 优惠券页的管理入口
router.get('/', (req, res, next) => {
    res.render('coupon');
});


// 按用户类型 发放 优惠券
router.get('/coupon_n_by_type', (req, res, next) => {
    School.find().exec((err, schools) => {
        if (err) {
            console.log('数据库查询出错');
            res.render('coupon_n_by_type', { schools: [] });
            return;
        }
        res.render('coupon_n_by_type', { schools: schools });
    });
});

// 按手机号 发放 优惠券
router.get('/coupon_n_by_phone', (req, res, next) => {
    res.render('coupon_n_by_phone');
});

// 按用户类型 发放 优惠券
router.get('/coupon_n_by_userid', (req, res, next) => {
    User.find({ "地址.姓名": { $ne: null } }).exec((err, users) => {
        if (err) {
            console.log('数据库查询出错');
            res.render('coupon_n_by_userid', { users: [] });
            return;
        }
        res.render('coupon_n_by_userid', { users: users });
    });
});


// 管理 优惠券（不存在的）
// router.get('/coupon_manage', (req, res, next) => {
//     res.render('coupon_manage');
// });


// 统计 优惠券
router.get('/coupon_statistic', (req, res, next) => {
    res.render('coupon_statistic');
});


// 请求优惠券统计
router.post('/coupon_statistic', (req, res, next) => {
    // 数据有：
    // req.body["开始时间"] yyyy-MM-dd
    // req.body["结束时间"] yyyy-MM-dd
    // req.body["发放方式"] 自动 or 手动
    if (!req.body["开始时间"] || !req.body["结束时间"] || !req.body["发放方式"]) {
        var errMsg = "请求内容缺少 开始时间 结束时间 或 发放方式";
        res.json({ ok: false, errMsg: errMsg });
        return;
    }

    const start_date = new Date(req.body["开始时间"]);
    const end_date = new Date(req.body["结束时间"]);

    if (req.body["发放方式"] == "自动") {
        const 时间段信息 = req.body["开始时间"] + " 至 " + req.body["结束时间"];

        const 自动发券类型 = [
            "七天满减",
            "十四天满减",
            "三十天满减",
            "新用户满减",
            "舍友满减",
            "首次付费满减"
        ];

        var statistic_results = [];

        自动发券类型.forEach((发券类型) => {
            Coupon.find({ "自动发券类型": 发券类型 }, (err, coupons) => {
                if (err || !coupons) { res.json({ ok: false }); return; }
                // 筛选出在开始时间到结束时间期间创建的券, 左闭右闭
                coupons = coupons.filter((coupon) => {
                    let createOn = utils.getThatDay(utils.convertObjectIdToDate(coupon._id));
                    return createOn >= start_date && createOn <= end_date;
                });
                console.log("筛选后为%张优惠券", coupons.length);
                var 发放量 = coupons.length;
                // 曝光率就是该时间段内所有操作的曝光的量/发送券的总量
                var 曝光量 = coupons.filter(x => x.已曝光).length;
                var 曝光率 = (发放量 ? 曝光量 / 发放量 : 0);
                var 使用量 = coupons.filter(x => x.状态 === "已用").length;
                // 曝光使用率就是使用量/曝光量
                var 曝光使用率 = (曝光量 ? 使用量 / 曝光量 : 0);
                statistic_results.push({
                    时间: 时间段信息,
                    优惠券类型: 发券类型,
                    发放量: 发放量,
                    曝光量: 曝光量,
                    曝光率: 曝光率,
                    使用量: 使用量,
                    曝光使用率: 曝光使用率,
                });
                // 判断是否完成所有统计
                if (statistic_results.length === 自动发券类型.length) {
                    res.render('subviews/coupon_statistic_sub_auto', { statistic_results: statistic_results });
                }
            });
        });

    } else if (req.body["发放方式"] == "手动") {
        // 不太一样，有点鸡儿复杂
        var statistic_results = [];

        // 没想到还有这种操作吧
        var 统计时段的每一天 = [... (function* () {
            for (let date = new Date(start_date); date <= end_date; date.setDate(date.getDate() + 1))
                yield new Date(date);
        })()];

        var 优惠券类型列表 = ["满减券", "商品券", "类目券"];

        Coupon.find({ "自动发券类型": { $exists: false } /* 手动 */ }, (err, coupons) => {
            统计时段的每一天.forEach((发放日) => {
                var 时间信息 = 发放日.getFullYear() + '-' + 发放日.getMonth() + '-' + 发放日.getDate();
                优惠券类型列表.forEach((优惠券类型名称) => {
                    var 某一天的某种优惠券列表 = coupons.filter((coupon) => {
                        var 券创建时间 = new Date(coupon._id.getTimestamp());
                        var 券创建日期 = new Date(券创建时间.setUTCHours(0, 0, 0, 0));
                        return coupon.优惠内容.券类型名称 === 优惠券类型名称 &&
                            券创建日期.getTime() === 发放日.getTime();
                    });
                    // 将其按不同内容分组
                    var 不同内容的优惠券集合 = {};
                    某一天的某种优惠券列表.forEach((优惠券) => {
                        var 优惠内容名称 = 优惠券.getNameSync();
                        if (!(优惠内容名称 in 不同内容的优惠券集合)) 不同内容的优惠券集合[优惠内容名称] = [];
                        不同内容的优惠券集合[优惠内容名称].push(优惠券);
                    });
                    Object.keys(不同内容的优惠券集合).forEach((优惠内容名称) => {
                        // 某一天某种优惠券某特定内容为一类
                        var 此类优惠券列表 = 不同内容的优惠券集合[优惠内容名称];

                        var 发放量 = 此类优惠券列表.length;
                        // 曝光率就是该时间段内所有操作的曝光的量/发送券的总量
                        var 曝光量 = 此类优惠券列表.filter(x => x.已曝光).length;
                        var 曝光率 = (发放量 ? 曝光量 / 发放量 : 0);
                        var 使用量 = 此类优惠券列表.filter(x => x.状态 === "已用").length;
                        // 曝光使用率就是使用量/曝光量
                        var 曝光使用率 = (曝光量 ? 使用量 / 曝光量 : 0);

                        statistic_results.push({
                            时间: 时间信息, // 时间按天算 如"2017-7-29"
                            优惠券类型: 优惠券类型名称,
                            优惠券内容: 优惠内容名称,
                            发放量: 发放量,
                            曝光量: 曝光量,
                            曝光率: 曝光率,
                            使用量: 使用量,
                            曝光使用率: 曝光使用率,
                        });
                    });
                });
            }); // 中文写代码 排版美如画
            res.render('subviews/coupon_statistic_sub_hand', { statistic_results: statistic_results });
        });
    } else {
        res.json({ ok: false });
    }
});


// 手动发（新建）优惠券
router.post('/new', (req, res, next) => {
    /* 
        数据例子：
        {
            '发放方式': '选择用户ID',
            '用户ID列表':
                [ 'oSw_s0GOyX4XPrLvMvouam0MzrKo',
                    'oSw_s0L6KOcjIWFUDKVyVRIRa8zo' ],
            '优惠券类型': '满减券',
            '优惠内容': { '价格要求': '12', '价格优惠': '2' },
            '有效期': { '生效日期': '2017-07-23', '失效日期': '2017-07-24' },
            '得券原因': 'qqq真的好',

            '是否通知': true, // 默认 false
            '每人发放量': 8, // 默认 1
        }

        其中，
        当发放方式为“选择用户ID”时，可以取到“用户ID列表”，是一个list[string]，里面是用户的openid。
        当发放方式为“选择用户类型”时，可以取到“学校名”，“宿舍楼”，“用户类型”三个字段，都是string；
        当发放方式为“选择用户手机号”时，可以取到“手机号列表”，是一个list[string]；

        接下来是优惠券的内容。
        首先查看“优惠券类型”，是“满减券”，“商品券”，“类目券”的一种。
        然后“优惠内容”里的东西是可以直接填到数据库的。
        “有效期”中的两个字段，是yyyy-MM-dd格式的日期字符串，需要parse
        “得券原因”是string，长度未限制
    */

    console.log("/new 请求 req.body是", req.body);

    // 先确定要创建的优惠券数额，即要发放的用户有哪些还有量是多少
    var userConditions = {};
    if (req.body.发放方式 === "选择用户ID") {
        userConditions = { "openid": { $in: req.body.用户ID列表 } };
    } else if (req.body.发放方式 === "选择用户类型") {
        if (req.body.学校名 === "全部") {
            /* do nothing for all dormitories in all school */
        } else {
            userConditions["地址.学校"] = req.body.学校名;
            if (req.body.宿舍楼 === "全部") {
                /* do nothing for all dormitories in this school */
            } else {
                userConditions["地址.宿舍楼"] = req.body.宿舍楼;
            }
        }
        if (req.body.用户类型 !== "全部用户") {
            userConditions["用户类型"] = req.body.用户类型;
        }
    } else if (req.body.发放方式 === "选择用户手机号") {
        // 只查询主地址（则非备用地址）的用户手机
        userConditions = { "地址.电话": { $in: req.body.手机号列表 } };
    } else {
        res.json({ ok: false, message: "调用参数有点问题啊兄弟" });
        return;
    }

    var someTypeDiscount;
    if (req.body.优惠券类型 === "满减券") {
        someTypeDiscount = new CouponType.CouponForPriceType(req.body.优惠内容);
    } else if (req.body.优惠券类型 === "商品券") {
        someTypeDiscount = new CouponType.CouponForFruitType(req.body.优惠内容);
    } else if (req.body.优惠券类型 === "类目券") {
        someTypeDiscount = new CouponType.CouponForCategoryType(req.body.优惠内容);
    }

    const 每人发放量 = Number.parseInt(req.body.每人发放量) || 1;

    console.log("待查找的用户筛选条件为", userConditions);
    User.find(userConditions, (err, users) => {
        if (err) {
            console.log("根据不同情况来查用户准备要给他们发券的，结果查失败", err);
            res.json({ ok: false });
            return;
        }
        console.log("筛选出%s个用户", users.length);
        let 群发短信电话列表 = [];
        let 群发短信内容 = undefined;
        let count = 0; // 用于解决异步问题
        users.forEach(user => {
            let inner_count = 0; // 用于解决异步问题
            for (let i = 0; i < 每人发放量; i++) {
                let newCoupon = new Coupon({
                    "优惠内容": someTypeDiscount,
                    "有效期": {
                        "生效日期": utils.getThatDay(new Date(req.body.有效期.生效日期)),
                        "失效日期": utils.getThatDay(new Date(req.body.有效期.失效日期)),
                    },
                    "归属者openid": user.openid,
                    "得券原因": req.body.得券原因,
                });
                newCoupon.save((err, coupon) => {
                    if (err) {
                        console.log("生成新优惠券失败", err);
                        res.json({ ok: false });
                        return;
                    }
                    inner_count++;
                    count++;

                    console.log("生成一张新的优惠券" + coupon._id + "，并发放给了用户" + user.openid);

                    // 当生成了最后一张优惠券的时候 尝试在要通知的情况下发短信
                    if (inner_count === 每人发放量 && req.body.是否通知 === true && user.地址 && user.地址.电话) {
                        群发短信电话列表.push(user.地址.电话);
                        if (群发短信内容 === undefined) {
                            群发短信内容 = utils.fillMessageTemplate(config.手动发券短信提醒内容模板, 每人发放量.toString(), coupon.getNameSync());
                        }
                    }
                });
            }
        });
        while (count != (users.length * 每人发放量)) {
            require('deasync').sleep(100); // 不会疯狂轮询堵住进程，只会卡住这个函数
        }
        if (群发短信电话列表.length > 0) {
            sendMultiMessage(群发短信电话列表, 群发短信内容, () =>
                console.log("不仅生成了优惠券，还给" + users.length + "名用户发了短信通知，美滋滋"));
        }
        res.json({ ok: true, message: "理论上来说应该将会发放" + (users.length * 每人发放量) + "张优惠券" });
    });
});

// 通过优惠券_id撕毁优惠券 request长成 { _id: "123456789abcdef" } 这样
router.post('/tear_up', (req, res, next) => {
    Coupon.findByIdAndUpdate({ _id: req.body._id }, { "状态": "撕毁" }, (err) => {
        if (err) {
            console.log("撕毁优惠券" + req.body._id + "失败");
            res.json({ ok: false })
            return;
        }
        console.log("成功撕毁优惠券" + req.body._id);
        res.json({ ok: true });
    });
});

function ensureCouponSettingExist(settings) {
    // 若无此项 则初始化
    const init_val_json = JSON.stringify({
        "开启": false,
        "价格要求": Number.MAX_SAFE_INTEGER.toString(),
        "价格优惠": '0',
        "得券原因": '天上掉的',
        "发送数量": '1',
        "有效时长": '4',
    });
    if (!settings.自动发券设置) {
        settings.自动发券设置 = {
            "七天满减": JSON.parse(init_val_json),
            "十四天满减": JSON.parse(init_val_json),
            "三十天满减": JSON.parse(init_val_json),
            "新用户满减": JSON.parse(init_val_json),
            "舍友满减": JSON.parse(init_val_json),
            "首次付费满减": JSON.parse(init_val_json),
        };
        fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
    }
}

function readCouponSetting() {
    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    ensureCouponSettingExist(settings);
    return settings.自动发券设置;
}

function writeCouponSetting(自动发券设置) {
    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    settings.自动发券设置 = 自动发券设置;
    fs.writeFileSync(settingsFilePath, JSON.stringify(settings));
}

// 自动发券设置 读设置
router.get('/coupon_n_auto', (req, res, next) => {
    res.render('coupon_n_auto', old_settings = readCouponSetting());
});

// 自动发券设置 写设置
router.post('/auto_settings', (req, res, next) => {
    // 一共就6种情况，数据为：
    // {
    //     发券方式: "舍友满减",
    //     开启: true || false,
    //     价格要求: '12',
    //     价格优惠: '4',
    //     得券原因: "天上掉的",
    //     发送数量: '1',
    //     有效时长: '4',
    // }   

    var 自动发券设置 = readCouponSetting();

    if (!(req.body["发券方式"] in 自动发券设置)) {
        res.json({ ok: false });
        return;
    }

    console.log(req.body);

    自动发券设置[req.body["发券方式"]] = {
        "开启": req.body["开启"],
        "价格要求": req.body["价格要求"],
        "价格优惠": req.body["价格优惠"],
        "得券原因": req.body["得券原因"],
        "发送数量": req.body["发送数量"],
        "有效时长": req.body["有效时长"],
    };

    writeCouponSetting(自动发券设置);

    res.json({ ok: true });
});

module.exports = router;