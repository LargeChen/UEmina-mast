var express = require('express');
var router = express.Router();
var http = require('http');
var qs = require('querystring');
var request = require('request');

var config = require('../config');
var sendMessage = require('../sendMessage').sendMessage;
var sendOrderNotice = require('../sendWxNotice').sendOrderNotice;
var printOrder = require('../printOrder');

var models = require('../models/models');
var config = require('../config');

var Order = models.Order;
var School = models.School;
var Coupon = models.Coupon;

// 订单页
router.route('/')
    // 显示订单列表
    .get((req, res, next) => {
        if (!req.query['学校'] || !req.query['开始时间'] || !req.query['结束时间'] || !req.query['宿舍楼']) {
            // 显示订单页
            // 这里应该附带上所有学校名
            School.find().exec((err, schools) => {
                if (err) {
                    console.log('数据库查询出错');
                    res.render('order', { schools: [] });
                    return;
                }
                res.render('order', { schools: schools });
            });
        } else {
            if (req.query['日期范围'] === '今日') {
                var today = new Date((new Date().toDateString()));
                console.log('today', today);
                Order.find({
                    '配送地址.学校': req.query['学校'],
                    '配送地址.宿舍楼': req.query['宿舍楼'],
                    '配送时段.开始时间': req.query['开始时间'],
                    '配送时段.结束时间': req.query['结束时间'],
                    '订单状态': '完成',
                }).where('创建时间').gte(today).exec((err, orders) => {
                    if (err) {
                        console.log('查询数据库错误');
                        res.json({ ok: false });
                        return;
                    }
                    Coupon.find({ _id: { $in: orders.map(x => x.优惠券_id).filter(x => x) } }, (err, coupons) => {
                        if (err || !coupons) {
                            console.error(err);
                            res.json({ ok: false });
                            return;
                        }
                        let coupons_table = new Map;
                        coupons.forEach(x => coupons_table.set(x._id.toString(), x));

                        orders.reverse();
                        res.render('subviews/order_sub', { orders: orders, coupons_table: coupons_table });
                    });
                });
            } else if (req.query['日期范围'] === '所有') {
                Order.find({
                    '配送地址.学校': req.query['学校'],
                    '配送地址.宿舍楼': req.query['宿舍楼'],
                    '配送时段.开始时间': req.query['开始时间'],
                    '配送时段.结束时间': req.query['结束时间'],
                    '订单状态': '完成',
                }, (err, orders) => {
                    if (err) {
                        console.log('查询数据库错误');
                        res.json({ ok: false });
                        return;
                    }
                    Coupon.find({ _id: { $in: orders.map(x => x.优惠券_id).filter(x => x) } }, (err, coupons) => {
                        if (err || !coupons) {
                            console.error(err);
                            res.json({ ok: false });
                            return;
                        }
                        let coupons_table = new Map;
                        coupons.forEach(x => coupons_table.set(x._id.toString(), x));

                        orders.reverse();
                        res.render('subviews/order_sub', { orders: orders, coupons_table: coupons_table });
                    });
                });
            } else {
                // 其他情况返回空订单列表
                res.render('subviews/order_sub', { orders: [] });
            }
        }
    });

// 由学校查配送时段
router.get('/check/delivery_period', (req, res, next) => {
    if (!req.query['学校名']) {
        res.json({
            ok: false, code: 25,
            codeName: '请求queryString未携带参数"学校名"'
        });
        return;
    }
    School.findOne({ '学校名': req.query['学校名'] }, '交易时段', (err, school) => {
        if (err) {
            console.log('查询数据库错误，可能不存在此学校');
            res.json({
                ok: false, code: 26,
                codeName: '查询数据库错误，可能不存在此学校'
            });
            return;
        }
        var result = [];
        school['交易时段'].forEach((elem) => result.push(elem['配送时段']));
        res.json({ ok: true, result: result }); // 规范接口从'配送时段'改为result
    });
});

// 由学校和配送时段查有订单的宿舍楼以及订单量
router.get('/check/dorm_building', (req, res, next) => {
    if (!req.query['学校名'] || !req.query['开始时间'] || !req.query['结束时间']) {
        res.json({
            ok: false, code: 27,
            codeName: '请求queryString未携带参数"学校名"或"配送时段"'
        });
        return;
    }
    var result = {}; // { '宿舍楼': '订单量' }
    var period = {
        "开始时间": req.query['开始时间'],
        "结束时间": req.query['结束时间'],
    };
    var today = new Date((new Date().toDateString()));
    console.log(today.toLocaleDateString());
    Order.find({
        '配送地址.学校': req.query['学校名'],
        '配送时段.开始时间': period['开始时间'],
        '配送时段.结束时间': period['结束时间'],
        '订单状态': '完成',
    }).where('创建时间').gte(today)
        .exec((err, orders) => {
            if (err) {
                console.log('查询数据库错误');
                res.json({ ok: false });
                return;
            }
            console.log('查数据库得到的订单列表', orders);
            orders.forEach((order) => {
                var building = order['配送地址']['宿舍楼'];
                result[building] = result[building] || 0;
                result[building]++;
            });

            // 按照学校宿舍楼的顺序，返回非0的
            School.findOne({
                '学校名': req.query['学校名']
            }).exec((err, school) => {
                if (err) {
                    console.log('查询数据库错误');
                    res.json({
                        ok: false
                    });
                    return;
                }
                sorted_result = []; // [ {'宿舍楼': ..., '订单量': ... } ]
                school.宿舍楼.forEach((building) => {
                    if (result[building] && result[building] > 0) {
                        sorted_result.push({
                            '宿舍楼': building,
                            '订单量': result[building],
                        });
                    }
                })

                res.json({
                    ok: true,
                    result: sorted_result
                });
            });

            // result = Object.keys(result).map((key) => {
            //     return {
            //         '宿舍楼': key,
            //         '订单量': result[key],
            //     }
            // }); // [ {'宿舍楼': ..., '订单量': ... } ]

            // result.sort((x, y) => y['订单量'] - x['订单量']);
            // console.log(result);
            // res.json({ ok: true, result: result });
        });
});

// 应该要收到学校、（配送）开始时间、（配送）结束时间、宿舍楼 （从前端的POST发来）
// 打印 今天 特定学校 特定宿舍楼 特定配送时段 的所有订单
router.post('/send_message', (req, res, next) => {
    if (!req.body['学校'] || !req.body['开始时间'] || !req.body['结束时间'] || !req.body['宿舍楼']|| !req.body['短信服务']) {
        res.json({
            ok: false, code: 29,
            codeName: '请求queryString未携带参数"学校"或"开始时间"或"结束时间"或"宿舍楼"或"短信服务"'
        });
        return;
    }
    var today = new Date((new Date().toDateString()));
    Order.find({
        '配送地址.学校': req.body['学校'],
        '配送地址.宿舍楼': req.body['宿舍楼'],
        '配送时段.开始时间': req.body['开始时间'],
        '配送时段.结束时间': req.body['结束时间'],
        '订单状态': '完成'
    })
        .where('创建时间').gte(today)
        .exec((err, orders) => {
            if (err) {
                console.log('从数据库中查找订单失败');
                res.json({ ok: false });
                return;
            }

            // 当作HashSet来去重
            var hash = {}; // phone: true
            
            // console.log(orders);
            var now_date = (new Date()).toLocaleDateString();
            var service = req.body['短信服务'];
            orders.forEach((order) => {
                var phone = order['配送地址']['电话'];
                if(hash[phone] != true) {
                    var name = order['配送地址']['姓名'];
                    var content = name + '同学，您的水果已经到了，请在15分钟内下楼领取，水果有任何问题请联系客服哦。短信由系统发出，请勿回复。';
                    sendMessage(phone, content, service, () => console.log(now_date + " " + phone + '短信发送成功'));
                    // 加入去重set
                    hash[phone] = true;
                }
            });

            res.json({ ok: true }); // 这个其实没什么卵意义
        });
});


// 应该要收到学校、（配送）开始时间、（配送）结束时间、宿舍楼 （从前端的POST发来）
// 给 今天 特定学校 特定宿舍楼 特定配送时段 的所有订单 发送**微信通知**
router.post('/send_order_notice', (req, res, next) => {
    if (!req.body['学校'] || !req.body['开始时间'] || !req.body['结束时间'] || !req.body['宿舍楼']) {
        res.json({
            ok: false, code: 29,
            codeName: '请求queryString未携带参数"学校"或"开始时间"或"结束时间"或"宿舍楼"'
        });
        return;
    }
    var today = new Date((new Date().toDateString()));
    Order.find({
        '配送地址.学校': req.body['学校'],
        '配送地址.宿舍楼': req.body['宿舍楼'],
        '配送时段.开始时间': req.body['开始时间'],
        '配送时段.结束时间': req.body['结束时间'],
        '订单状态': '完成'
    })
        .where('创建时间').gte(today)
        .exec((err, orders) => {
            if (err) {
                console.log('从数据库中查找订单失败');
                res.json({ ok: false });
                return;
            }

            // var service = req.body['短信服务'];
            orders.forEach((order) => {
                var order_time = order.配送时段.开始时间 + ' - ' + order.配送时段.结束时间;
                var order_address = order.配送地址.学校 + ' ' + order.配送地址.宿舍楼 + ' ' + order.配送地址.宿舍号;
                var order_content = '';
                order.商品条目.forEach((product) => {
                    order_content += product.商品名 + ' * ' + product.数量 + '份\n';
                });
                order_content = order_content.trim();
                sendOrderNotice(order.买家openid, order_time, order_address, order_content);
            });

            res.json({ ok: true }); // 这个其实没什么卵意义
        });
});


// 打印机打印订单
router.post('/print_orders', (req, res, next) => {
    // console.log('尝试打印订单');
    if (!req.body['学校'] || !req.body['开始时间'] || !req.body['结束时间'] || !req.body['宿舍楼']) {
        res.json({
            ok: false, code: 29,
            codeName: '请求queryString未携带参数"学校"或"开始时间"或"结束时间"或"宿舍楼"'
        });
        return;
    }
    var today = new Date((new Date().toDateString()));
    Order.find({
        '配送地址.学校': req.body['学校'],
        '配送地址.宿舍楼': req.body['宿舍楼'],
        '配送时段.开始时间': req.body['开始时间'],
        '配送时段.结束时间': req.body['结束时间'],
        '订单状态': '完成'
    })
        .where('创建时间').gte(today)
        .exec((err, orders) => {
            if (err) {
                console.log('从数据库中查找订单失败');
                res.json({ ok: false });
                return;
            }
            // console.log(orders);
            School.findOne({ '学校名': req.body['学校'] }, (err, school) => {
                if (err) {
                    console.log('从数据库中查找学校失败');
                    res.json({ ok: false });
                    return;
                }
                for (let i = 0; i < orders.length; i++) {
                    var order = orders[i];
                    printOrder(order, school.打印机信息.SN码, () => console.log('打印订单%s成功', order._id));
                }
                res.json({ ok: true });
            });
        });

});

module.exports = router;
