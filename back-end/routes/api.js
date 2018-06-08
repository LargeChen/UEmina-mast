var fs = require('fs');
var path = require('path');
var config = require('../config');
var utils = require('../utils');
var printOrder = require('../printOrder');
var sendMessage = require('../sendMessage').sendMessage;
var request = require('request');
var md5 = require('md5');
var xml2js = require('xml2js');
var xmlparser = require('express-xml-bodyparser');
const queryString = require('query-string');

var express = require('express');
var router = express.Router();

var models = require('../models/models');
var mongoose = require('mongoose');
var Schema = mongoose.Schema
var Order = models.Order;
var School = models.School;
var User = models.User;
var Product = models.Product;
var Category = models.Category;
var Coupon = models.Coupon;
var NoticeKey = models.NoticeKey;

var distributeCouponToUsers = require('./utils').distributeCouponToUsers;
var getDiscountSync = require('./utils').getDiscountSync;

var checkCouponIfIsSatisfiedAllRequirementSync = require('./utils').checkCouponIfIsSatisfiedAllRequirementSync;

// 候选图路径
var uploadedImagePath = config.uploadedImagePath;
var productImagesFilePath = config.productImagesFilePath;
var productImagesDir = productImagesFilePath.replace(config.publicPath, '');
var settingsFilePath = config.settingsFilePath;

router.post('/upload/img', (req, res, next) => {
    if (!req.files || !(req.files.thumbnails || req.files.detialsMap)) {
        res.status(422).json({ ok: false, error: '没有收到文件' });
        console.log('没有收到文件');
        return;
    }
    var file = req.files.thumbnails || req.files.detialsMap;
    if (file.size > 10000000) {
        res.status(422).json({ ok: false, error: '文件大于10M' });
        console.log('文件大于10M');
        return;
    }
    if (file.type.substring(0, 6) !== 'image/') {
        res.status(422).json({ ok: false, error: '文件类型不为图片' });
        console.log('文件类型不为图片');
        return;
    }
    var distpath = path.join(uploadedImagePath, file.name);
    if (fs.existsSync(distpath)) {
        res.status(422).json({ ok: false, error: '已存在同名文件' });
        console.log('已存在同名文件');
        return;
    }
    // 若不存在上传文件夹则创建一个
    utils.promiseDirExists(uploadedImagePath);

    // 移动到图片候选文件夹中
    utils.fsRename(file.path, distpath, (err) => {
        if (err) {
            console.error(err);
            res.json({ ok: false });
            return;
        }
        res.json({ ok: true });
        console.log('成功上传文件，保存到' + distpath);
    });
});

router.delete('/upload/img', (req, res, next) => {
    if (!req.body || !req.body.filename) {
        res.status(422).json({ ok: false, error: '删除请求未携带待删文件名' });
        console.log('删除请求未携带待删文件名');
        return;
    }
    var filepath = path.join(uploadedImagePath, req.body.filename);
    if (!fs.existsSync(filepath)) {
        res.status(422).json({ ok: false, error: '待删文件不存在' });
        console.log('待删文件不存在');
        return;
    }
    fs.unlink(filepath, (err) => {
        if (err) {
            res.json({ ok: false, error: err.message });
            return;
        }
        res.json({ ok: true });
        console.log('成功删除文件' + filepath);
    });
});

// 微信小程序首页获取分类作为横滑动栏的项（按权重排）
router.get('/categories', (req, res, next) => {
    Category.find().sort({ '权重': -1 }).exec((err, categories) => {
        if (err) {
            console.log(err);
            res.json({ ok: false }); // 这里不应该出错的所以没有错误code
            return;
        }
        // e.g. ["鲜果", "果切", "果饮", "干果", "套餐"]
        categories = categories.map((elem) => elem['类目名']);
        res.json({ ok: true, categories: categories });
    });
});



// 获取首页banner
router.get('/banners', (req, res, next) => {
    // 疯狂硬编码
    res.json({
        ok: true, banners: [
            // url：图片链接，必填
            // target：跳转链接，可以为空串
            // {
            //     url: '/banners/banner-12.jpg',
            //     target: ''
            // },
            // {
            //     url: '/banners/banner-11.jpg',
            //     target: ''
            // }
        ]
    });
});

router.get('/products', (req, res, next) => {
    var findParam = { '在售': true };
    if (typeof req.query['每日特惠'] !== 'undefined')
        findParam['每日特惠'] = req.query['每日特惠'];
    if (typeof req.query['类目'] !== 'undefined')
        findParam['类目'] = req.query['类目'];

    Product.find(findParam).sort({ '权重': -1 }).exec((err, products) => {
        if (err) {
            console.log(err);
            res.json({ ok: false });
            return;
        }

        products.forEach((elem) => {
            var fillImagesPath = (filename) =>
                path.join(productImagesDir, elem['_id'].toString(), filename);
            elem['缩略图'] = elem['缩略图'].map(fillImagesPath);
            elem['详情图'] = elem['详情图'].map(fillImagesPath);
        });
        res.json({ ok: true, products: products });
    })
});

// 传入'商品名'，其值实际为单个字符串的时候就返回一个商品，其值为一个Array的字符串时就返回一堆商品
router.get('/product', (req, res, next) => {
    // trick 用JSON.parse判断字符串是否数组toString后的字符串
    try {
        var product_names = JSON.parse(req.query['商品名']);
        Product.find({ '商品名': { $in: product_names }, '在售': true }, (err, products) => {
            if (err) {
                console.log(err);
                res.json({ ok: false });
                return;
            }
            products = products || [];
            products.forEach((elem) => {
                var fillImagesPath = (filename) =>
                    path.join(productImagesDir, elem['_id'].toString(), filename);
                elem['缩略图'] = elem['缩略图'].map(fillImagesPath);
                elem['详情图'] = elem['详情图'].map(fillImagesPath);
            });
            res.json({ ok: true, products: products });
        });
    } catch (e) {
        Product.findOne({ '商品名': req.query['商品名'], '在售': true }, (err, product) => {
            if (err || !product) {
                console.log(err);
                res.json({ ok: false });
                return;
            }
            console.log(product);
            var fillImagesPath = (filename) =>
                path.join(productImagesDir, product['_id'].toString(), filename);
            product['缩略图'] = product['缩略图'].map(fillImagesPath);
            product['详情图'] = product['详情图'].map(fillImagesPath);
            res.json({ ok: true, product: product });
        });
    }
});

// 获取营业时间
router.get('/openning_time', (req, res, next) => {
    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    res.json({
        ok: true,
        '营业时间': settings['营业时间'],
    });
});

// 返回学校名称列表
router.get('/schools', (req, res, next) => {
    School.find().exec((err, schools) => {
        if (err) {
            console.log(err);
            res.json({ ok: false });
            return;
        }
        res.json({ ok: true, schools: schools.map(school => school['学校名']) });
    });
});


// 返回商品 名称 列表
router.get('/product_names', (req, res, next) => {
    Product.find().exec((err, products) => {
        if (err) {
            console.log(err);
            res.json({ ok: false });
            return;
        }
        res.json({ ok: true, products: products.map(product => product.商品名) });
    });
});


// 通过学校名获取宿舍楼
router.get('/dormitories', (req, res, next) => {
    if (!req.query['学校名']) {
        console.log('请求queryString未携带参数"学校名"');
        res.json({ ok: false, errMsg: '请求queryString未携带参数"学校名"' });
        return;
    }
    School.findOne({ '学校名': req.query['学校名'] }, (err, school) => {
        if (err || !school) {
            console.log('查询数据库出错');
            res.json({ ok: false });
            return;
        }
        var dormitories = school['宿舍楼'];
        res.json({ ok: true, dormitories: dormitories });
    });
});

// 通过学校名获得配送信息
router.get('/delivery_info', (req, res, next) => {
    if (!req.query['学校名']) {
        console.log('请求queryString未携带参数"学校名"');
        res.json({ ok: false, errMsg: '请求queryString未携带参数"学校名"' });
        return;
    }
    School.findOne({ '学校名': req.query['学校名'] })
        .select('学校名 起送价 运费 交易时段')
        .exec((err, delivery_info) => {
            if (err) {
                console.log('查询数据库出错');
                res.json({ ok: false });
                return;
            }
            if (!delivery_info) {
                console.log('不存在此学校');
                res.json({ ok: false, errMsg: '不存在此学校' });
                return;
            }
            var now = (new Date().toLocaleTimeString('en-US', { hour12: false })).substr(0, 5);
            delivery_info['交易时段'] = delivery_info['交易时段'].filter((elem) =>
                now >= elem['下单时段']['开始时间'] && now <= elem['下单时段']['结束时间']
            );

            res.json({ ok: true, delivery_info: delivery_info });
        });
});


// 获取用户的类型，通过学校和宿舍楼
router.get('/types_of_user', (req, res, next) => {
    // req.query['学校名'], req.query['宿舍楼']
    let userCondition = {};
    if (req.query["学校名"] !== "全部") {
        userCondition["地址.学校"] = req.query["学校名"];
    }
    if (req.query["宿舍楼"] !== "全部") {
        userCondition["地址.宿舍楼"] = req.query["宿舍楼"];
    }
    User.find(userCondition, (err, users) => {
        if (err || !users) {
            console.log("数据库查询失败");
            res.json({ ok: false });
            return;
        }
        var types = [{ type_name: '全部用户', count: users.length }];
        var 用户类型统计 = { "活跃用户": 0, "付费用户": 0, "一般用户": 0, "核心用户": 0, "新增用户": 0, "流失用户": 0 };
        users.forEach(user => {
            user.用户类型.forEach(type => 用户类型统计[type]++);
        });
        Object.keys(用户类型统计).forEach(type_key => types.push({ type_name: type_key, count: 用户类型统计[type_key] }));
        res.json({ ok: true, types: types });
    });
});

// 接收微信支付的notify_url
router.all('/payment_notify', xmlparser({ trim: false, explicitArray: false }),
    (req, res, next) => {
        console.log('接收到支付结果的提醒啦！！！');
        console.log(req.body);
        var success_xml = "<xml>\n<return_code><![CDATA[SUCCESS]]></return_code>\n<return_msg><![CDATA[OK]]></return_msg>\n</xml>";
        var result = req.body.xml;
        if (!result) {
            console.log('支付结果的提醒携带的xml有问题');
            res.sendStatus(500);
            return;
        }
        if (!result.result_code || !result.return_code) {
            console.log('支付不成功，订单设置为取消');
            var fail_update = { '订单状态': '取消' };
            // TODO: 似乎有bug，order_id和done_update是不可见的？还有下面返回的success_xml似乎也不对
            Order.findByIdAndUpdate(order_id, done_update, (err) => {
                if (err) {
                    console.log('修改订单状态为`取消`失败', err);
                    res.sendStatus(500);
                    return;
                }
                console.log('订单支付失败，订单取消！');
                res.send(success_xml);
            });
            return;
        }

        var tmp = Object.assign({}, result); // deep copy
        var tmp_sign = tmp.sign; // save sign for matching as below
        delete tmp.sign; // sign itself does not join in the sign

        // 根据 https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=4_3 方法签名
        var stringA = queryString.stringify(tmp);

        var stringSignTemp = stringA + '&key=' + config.paymentKey;
        var sign = utils.md5(stringSignTemp).toUpperCase();

        if (tmp_sign === sign) {
            console.log('签名验证正确！');
            var order_id = result.out_trade_no;
            Order.findOneAndUpdate({ _id: order_id, '订单状态': '未完成' },
                { '订单状态': '完成', '完成时间': new Date },
                { new: true },
                (err, order) => {
                    if (err) {
                        console.log('修改订单状态为已完成失败', err);
                        res.sendStatus(500);
                        return;
                    }
                    if (!order) {
                        console.log('找不到相应的未完成的订单');
                        res.sendStatus(500);
                        return;
                    }
                    /////////////////////////////////////////////
                    //        此处才是订单真正完成的地方
                    /////////////////////////////////////////////
                    console.log('订单支付成功！订单已完成！');
                    res.send(success_xml);

                    // 库存减少相应的量
                    order['商品条目'].forEach((elem) => {
                        Product.findOneAndUpdate({ '商品名': elem['商品名'], '库存': { $gte: elem['数量'] } },
                            { $inc: { '库存': - elem['数量'] } },
                            { new: true },
                            (err, product) => {
                                if (err || !product) {
                                    console.log('数据库修改库存错误', err, product);
                                    return;
                                }
                                console.log('数据库修改库存成功', product);
                            });
                    });

                    // 使优惠券使用状态变为已用
                    if (order.优惠券_id) {
                        console.log('准备更新优惠券使用状态为 已用 ...');
                        Coupon.findByIdAndUpdate(order.优惠券_id, { '状态': '已用' }, (err, coupon) => {
                            if (err || !coupon) {
                                console.log('优惠券使用状态更新失败');
                                return;
                            }
                            console.log('优惠券' + coupon._id + '状态更新为 ' + coupon.状态);
                        });
                    }

                    // 自动打印订单
                    School.findOne({ '学校名': order.配送地址.学校 }, (err, school) => {
                        if (school && school.打印机信息 && school.打印机信息.SN码)
                            printOrder(order, school.打印机信息.SN码, () => console.log('自动打印订单%s成功', order._id));
                        else
                            console.log('自动打印订单失败');
                    });

                    // 把对应的noticeKey变为有效
                    console.log("更新订单id为:" + order._id.toString() + "的noticeKey为生效");
                    NoticeKey.updateMany({ "订单id": order._id.toString() }, { $set: { "状态": "生效" }}, (err) => {
                        if(err) {
                            console.log("修改noticeKey失败");
                            console.log(err);
                            return;
                        }
                        console.log("修改noticeKey成功");
                    } );

                    // 对第一次消费的用户，会发放两张满减券，满减券的配置管理员可以更改
                    // 用户第一次消费后，他的舍友会获得满减券（用默认地址的宿舍楼和宿 舍号进行匹配），最多
                    // 只能匹配5个舍友，超过5个后还有匹配的用户不获得优惠券，满减券的配置管理员可以更改
                    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
                    let order_id = (typeof order._id === "string") ? Schema.Types.ObjectId(order._id) : order._id;
                    User.findOne({ "历史订单": order_id }, (err, user) => {
                        console.log("找到这个刚完成了的订单的用户了：", user.openid);
                        if (err) throw new Error; // 不应该出错的
                        Order.find({ _id: { $in: user.历史订单 }, "订单状态": "完成" }, (err, orders) => {
                            if (err) throw new Error; // 不应该出错的
                            // console.log("找出所有此用户已完成的订单：", orders);
                            if (orders.length === 1 && orders[0]._id.toString() === order_id.toString()) { // 若这次消费是第一次消费
                                console.log("是第一次消费 准备发券");
                                // 若开启了，则为首次付费用户发放两张满减券
                                if (settings.自动发券设置 && settings.自动发券设置.首次付费满减 && settings.自动发券设置.首次付费满减.开启) {
                                    distributeCouponToUsers([user], "首次付费满减", (err, coupon) => {
                                        if (err)
                                            console.log("自动发 首次付费满减券 失败", err);
                                        else {
                                            console.log("成功为首次付费用户发 首次付费满减券", coupon._id);
                                            if (user.地址 && user.地址.电话)
                                                sendMessage(user.地址.电话, utils.fillMessageTemplate(config.自动首次付费满减券短信提醒内容模板, coupon.getNameSync()), 'yunpian'); // 自动发短信提醒
                                            // console.log("成功为首次付费用户发 第一张 首次付费满减券", coupon._id);
                                            // distributeCouponToUsers([user], "首次付费满减", (err, coupon) => {
                                            //     if (err)
                                            //         console.log("自动发 第二张 首次付费满减券 失败", err);
                                            //     else {
                                            //         console.log("成功为首次付费用户发 第二张 首次付费满减券", coupon._id);
                                            //         if (user.地址 && user.地址.电话)
                                            //             sendMessage(user.地址.电话, utils.fillMessageTemplate(config.自动首次付费满减券短信提醒内容模板, coupon.getNameSync()), 'yunpian'); // 自动发短信提醒
                                            //     }
                                            // });
                                        }
                                    });
                                }
                                // 若开启了，则为首次付费用户舍友发一张满减券， 确保有填宿舍号的情况下才发
                                if (settings.自动发券设置 && settings.自动发券设置.舍友满减 && settings.自动发券设置.舍友满减.开启 && user.地址 && user.地址.宿舍号) {
                                    // 找舍友
                                    User.find({ "地址.学校": user.地址.学校, "地址.宿舍楼": user.地址.宿舍楼, "地址.宿舍号": user.地址.宿舍号, "openid": { $ne: user.openid } })
                                        .limit(5).exec((err, users) => {
                                            distributeCouponToUsers(users, "舍友满减", (err, coupon) => {
                                                if (err) {
                                                    console.log("自动发 舍友满减券 失败", err);
                                                    return;
                                                }
                                                console.log("成功为首次付费用户的舍友发 舍友满减券", coupon._id);
                                                users.forEach(user => {
                                                    if (user.地址 && user.地址.电话)
                                                        sendMessage(user.地址.电话, utils.fillMessageTemplate(config.自动发舍友满减券短信提醒内容模板, coupon.getNameSync()), 'yunpian'); // 自动发短信提醒
                                                });
                                            });

                                        });
                                }
                            }
                        });
                    });
                });
        }
    });

// 携带code，返回3rd_session，即session_id
router.get('/get_session_id', (req, res, next) => {
    var code = req.header('code');
    if (!code) {
        res.json({ ok: false, errMsg: '用户header里没有code' });
        return;
    }
    utils.getUserSession(code, (err, info) => {
        if (err || !info.openid || !info.session_key) {
            console.log('可能是重复向微信服务器请求解析code', err);
            res.json({ ok: false });
            return;
        }
        var openid = info.openid;
        // 通过md5和sha1处理当天时间+openid的字符串后得到session_id
        var session_id = utils.encrypt(utils.getCookieValue() + openid);
        // 将session_key和openid信息存入本地session储存中（以session_id为键）
        if (!req.app.locals.session)
            req.app.locals.session = {};
        req.app.locals.session['session_id'] = info;
        // 判断是否为初次使用的用户，若是则将其放进数据库中
        User.findOne({ openid: openid }, (err, user) => {
            if (err) {
                console.log('查找用户时出了问题');
                res.json({ ok: false });
                return;
            }
            if (!user) {
                var user = new User({
                    openid: openid,
                    '历史订单': [],
                    '最近登录时间': new Date,
                });
                user.save((err, user) => {
                    if (err) {
                        console.log('创建新用户出错', err);
                    }
                    console.log('成功新建用户并录入openid');

                    // 对第一次进⼊ue鲜果的用户，会发放⼀张满减券，满减券的配置管理理员可以更改
                    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
                    if (settings.自动发券设置 && settings.自动发券设置.新用户满减 && settings.自动发券设置.新用户满减.开启) {
                        distributeCouponToUsers([user], "新用户满减", (err, coupon) => {
                            if (err)
                                console.log("自动发新用户满减券失败", err);
                            else
                                console.log("成功为新用户发放新用户满减券", coupon._id);
                        });
                    }
                });
            }
        });
        res.json({ ok: true, session_id: session_id, openid: openid });
    });
});

// 身份验证，判断header是否携带openid和session_id
// 以下api需要用户身份验证才能调用
router.all('/*', (req, res, next) => {
    var openid = req.header('openid');
    var session_id = req.header('session_id');
    if (!openid || !session_id) {
        res.json({ ok: false, errMsg: '请求header未携带openid或session_id' });
        return;
    }
    // 判断cookie的正确性
    console.log(openid, session_id);
    if (session_id !== utils.encrypt(utils.getCookieValue() + openid)) {
        console.log('cookie错误');
        res.json({ ok: false, errMsg: 'cookie错误或超时' });
        return;
    }
    // 成功通过
    res.locals.openid = openid;
    console.log('请求方通过身份验证，openid为%s...', openid);
    // 刷新最近登录时间
    User.findOneAndUpdate({ openid: openid }, { "最近登录时间": new Date() }, { new: true }, (err, user) => {
        if (err || !user) {
            console.log('更新用户最近一次登录时间信息失败，可能为新用户，不必更新');
            return;
        }
        console.log('成功更新用户最近一次登录时间', user.openid);
    });
    next();
});

// 通过header的code获取用户地址信息
router.get('/address', (req, res, next) => {
    console.log('准备获取用户地址信息');
    if (!res.locals.openid) {
        console.log('未通过验证 无法获取用户地址信息');
        res.json({ ok: false });
        return;
    }
    // 备用地址
    var backup_address = req.query['备用'] === 'true';
    console.log(req.query);
    User.findOne({ openid: res.locals.openid }, (err, user) => {
        if (err || !user) {
            res.json({ ok: false });
            return;
        }
        var address = backup_address ? user['备用地址'] : user['地址'];
        console.log('成功获取用户地址信息', address);
        res.json({ ok: true, address: address });
    });
});


// 通过header的code获取用户的【两个地址】信息
router.get('/address_all', (req, res, next) => {
    console.log('准备获取用户地址信息');
    if (!res.locals.openid) {
        console.log('未通过验证 无法获取用户地址信息');
        res.json({ ok: false });
        return;
    }
    User.findOne({ openid: res.locals.openid }, (err, user) => {
        if (err || !user) {
            res.json({ ok: false });
            return;
        }
        res.json({ ok: true, address: user['地址'], address_spare: user['备用地址'] });
    });
});

// 通过header的code获取用户学校对应的客服电话和微信
router.get('/service', (req, res, next) => {
    console.log('准备获取客服，先获取用户地址信息');
    if (!res.locals.openid) {
        console.log('未通过验证 无法获取用户地址信息');
        res.json({ ok: false });
        return;
    }
    User.findOne({ openid: res.locals.openid }, (err, user) => {
        if (err || !user) {
            res.json({ ok: false });
            return;
        }
        // console.log('成功获取用户地址信息', user['地址']);
        address = user['地址'];
        if (address == null || address.学校 == null) {
            res.json({ ok: true });
        } else {
            School.findOne({ '学校名': address.学校 }, (err, school) => {
                if (err || !school) {
                    console.log('查询学校数据库出错');
                    res.json({ ok: false });
                    return;
                }
                res.json({ ok: true, service: school.客服 });
            });
        }
    });
});

// 通过header的code获取用户历史订单
router.get('/order', (req, res, next) => {
    console.log('获取用户%s的历史订单...', res.locals.openid);
    User.findOne({ openid: res.locals.openid }, (err, user) => {
        if (err || !user) {
            console.log('数据库查找用户失败，可能是找不到用户', err);
            res.json({ ok: false });
            return;
        }
        var order_list = user['历史订单'];
        console.log('查找这些订单:', order_list);
        Order.find({ _id: { $in: order_list }, '订单状态': '完成' },
            '完成时间 配送地址 商品条目 运费 支付金额 备注 配送时段 优惠券_id',
            (err, orders) => {
                if (err) {
                    console.log('数据库查询用户的历史订单失败', err);
                    res.json({ ok: false });
                    return;
                }
                console.log("订单有", orders);
                console.log(orders.map(x => x.优惠券_id));
                // 给每个订单附上优惠券使用内容
                Coupon.find({ _id: { $in: orders.map(x => x.优惠券_id).filter(x => x) } }, (err, coupons) => {
                    if (err || !coupons) {
                        console.error(err);
                        return;
                    }
                    console.log("查出来的优惠券有" + coupons.length + "张", "订单有" + orders.length + "个，也就是有些订单没用优惠券");

                    let coupons_table = new Map;
                    coupons.forEach(x => coupons_table.set(x._id.toString(), x));
                    orders = JSON.parse(JSON.stringify(orders));
                    console.log("orders are ", orders);
                    for (let i = 0; i < orders.length; i++) {
                        let coupon = orders[i].优惠券_id ? coupons_table.get(orders[i].优惠券_id.toString()) : undefined;
                        console.log("对于订单" + orders[i]._id + ", 其优惠券为" + coupon);
                        if (coupon) {
                            console.log("getNameSync: ", coupon.getNameSync());
                            orders[i]['所用优惠券内容'] = coupon.getNameSync();
                            console.log("此订单内容为: ", orders[i]);
                        }
                    }
                    orders.reverse();
                    res.json({ ok: true, orders: orders });
                    console.log('获取用户历史订单成功并返回', orders);
                });
            });
    });
});

// 通过header的code获取一个用户的所有优惠券的API，按创建（发券）时间排序，越新越前
// 不曝光
router.get('/coupon', (req, res, next) => {
    console.log('获取用户%s的所有优惠券...', res.locals.openid);
    User.findOne({ openid: res.locals.openid }, (err, user) => {
        if (err || !user) {
            console.log('数据库查找用户失败，可能是找不到用户', err);
            res.json({ ok: false });
            return;
        }
        Coupon.find({ '归属者openid': user.openid }, (err, coupons) => {
            if (err) {
                console.log('数据库查询用户的优惠券失败', err);
                res.json({ ok: false });
                return;
            }
            coupons.sort((a, b) => {
                b._id.getTimestamp() - a._id.getTimestamp()
            });
            let available_coupons = coupons.filter(coupon => coupon.isAvailableSync());
            let unavailable_coupons = coupons.filter(coupon => !coupon.isAvailableSync());
            res.json({
                ok: true,
                coupons: available_coupons, // 本来应该是coupons的 但已经提交审核了所以先这样处理 能够保证执行正确
                available_coupons: available_coupons,
                unavailable_coupons: unavailable_coupons
            });
        });
    });
});

// 通过header的code修改用户地址信息
router.post('/address', (req, res, next) => {
    console.log('准备存入用户地址信息...', req.body);
    var address_to_save = {
        '学校': req.body['学校'],
        '宿舍楼': req.body['宿舍楼'],
        '宿舍号': req.body['宿舍号'],
        '姓名': req.body['姓名'],
        '电话': (utils.toValidPhoneNumberOrNull(req.body['电话']) || '')
    };
    if (req.body['备用'] === true) {
        if (req.body['设为默认'] === true) {
            User.findOne({ openid: res.locals.openid }, (err, old_user) => {
                var old_default_addr = old_user['地址'];
                var update = {
                    '地址': address_to_save,
                    '备用地址': old_default_addr
                };
                User.findOneAndUpdate({ openid: res.locals.openid }, update, { new: true }, (err, user) => {
                    if (err || !user) {
                        console.log('存入用户地址信息失败');
                        res.json({ ok: false });
                        return;
                    }
                    console.log('成功存入用户地址信息', user);
                    res.json({ ok: true });
                });
            });
        } else {
            var update = {
                '备用地址': address_to_save
            };
            User.findOneAndUpdate({ openid: res.locals.openid }, update, { new: true }, (err, user) => {
                if (err || !user) {
                    console.log('存入用户地址信息失败');
                    res.json({ ok: false });
                    return;
                }
                console.log('成功存入用户地址信息', user);
                res.json({ ok: true });
            });
        }
    } else {
        var update = {
            '地址': address_to_save
        };
        User.findOneAndUpdate({ openid: res.locals.openid }, update, { new: true }, (err, user) => {
            if (err || !user) {
                console.log('存入用户地址信息失败');
                res.json({ ok: false });
                return;
            }
            console.log('成功存入用户地址信息', user);
            res.json({ ok: true });
        });
    }
});

// 用户下单 我们把待支付信息返回给客户端 客户端再通过wx.requestPayment支付
// UPDATE: 当post内容有 '优惠券_id' 字段时 则check一下此优惠券是否可用 可用则用 不可用报错
router.post('/buy', (req, res, next) => {
    // 需要在营业时间内才能请求这个api
    var settings = JSON.parse(fs.readFileSync(settingsFilePath, 'utf8'));
    var openning_time = settings['营业时间'];
    var now = (new Date().toLocaleTimeString('en-US', { hour12: false })).substr(0, 5);
    console.log('现在时间是:', now);
    console.log('测试五月三号的bug看看小程序发过来的配送时间是否正确：', req.body);
    if (now < openning_time['开始时间'] || now > openning_time['结束时间']) {
        var errMsg = '非营业时间内';
        console.log(errMsg);
        res.json({ ok: false, errMsg: errMsg });
        return;
    }
    if (!req.body['商品条目'] || !req.body['配送时段']) {
        var errMsg = '缺少"商品条目"(商品名为key购买量为value的object)或"配送时段"';
        console.log(errMsg);
        res.json({ ok: false, errMsg: errMsg });
        return;
    }
    User.findOne({ openid: res.locals.openid }).exec((err, user) => {
        if (err || !user) {
            console.log('查询数据库出错', err);
            res.json({ ok: false });
            return;
        }

        Order.find({ _id: { $in: user.历史订单 } }, (err, orders) => {
            if (err) throw err;

            // 若上一订单刚生成，则10秒内不能再下单，防止多次下单
            if (orders.length > 0) {
                let prev_order_timestamp = Math.max(...orders.map(o => o._id.getTimestamp()));
                let prev_order_date = new Date(prev_order_timestamp);
                let now = new Date;
                if (utils.isInvalidDate(prev_order_date)) throw new Error("不应该啊 订单_id转化为Date出错");
                let diff_secs = Math.floor((now - prev_order_date) / 1000);
                if (diff_secs <= 10) {
                    let errMsg = "10秒内不能重复下单";
                    console.error(errMsg);
                    res.json({ ok: false, errMsg: errMsg });
                    return;
                }
            }

            var product_name_list = Object.keys(req.body['商品条目']);
            Product.find({ '商品名': { $in: product_name_list } })
                .select('商品名 单价 库存 在售 类目')
                .exec((err, products) => {
                    if (err) {
                        console.log('查询数据库出错', err);
                        res.json({ ok: false });
                        return;
                    }
                    for (let i = 0; i < products.length; i++) {
                        if (!products[i]['在售']) {
                            var errMsg = '已下架:' + products[i]['商品名'];
                            console.log(errMsg);
                            res.json({ ok: false, errMsg: errMsg });
                            return;
                        }
                    }
                    for (let i = 0; i < products.length; i++) {
                        if (products[i]['库存'] < req.body['商品条目'][products[i]['商品名']]) {
                            var errMsg = '库存不足:' + products[i]['商品名'];
                            console.log(errMsg);
                            res.json({ ok: false, errMsg: errMsg });
                            return;
                        }
                    }
                    var address = req.body['地址使用'] === 'spare' ? user['备用地址'] : user['地址'];
                    if (!address || !address['学校'] || !address['宿舍楼'] ||
                        !address['姓名'] || !address['电话']) {
                        console.log('地址不完善:', address);
                        res.json({ ok: false, errMsg: '地址不完善' });
                        return;
                    }
                    var cart_list = products.map((elem) => {
                        return {
                            '商品名': elem['商品名'],
                            '类目': elem['类目'],
                            '单价': elem['单价'],
                            '数量': req.body['商品条目'][elem['商品名']],
                        }
                    });
                    console.log('购买列表：', cart_list);


                    School.findOne({ '学校名': address['学校'] }).exec((err, school) => {
                        if (err || !school) {
                            console.log('查询数据库出错', err);
                            res.json({ ok: false });
                            return;
                        }

                        if (!school.宿舍楼.includes(address['宿舍楼'])) {
                            let errMsg = "宿舍楼无效";
                            console.error(errMsg);
                            res.json({ ok: false, errMsg: errMsg });
                            return;
                        }

                        function makeOrder(coupon) {
                            var coupon_id = undefined;
                            var discount = 0; // 默认无折扣
                            // 判断是否下单时使用优惠券
                            if (coupon instanceof Coupon) {
                                coupon_id = coupon._id;
                                discount = getDiscountSync(cart_list, coupon);
                            }
                            // 商品总价
                            var total_amount = cart_list.reduce((acc, item) => {
                                return acc + item['单价'] * item['数量'];
                            }, 0);
                            total_amount = parseFloat(total_amount.toFixed(2)); // 精度问题
                            var freight = total_amount < school['起送价'] ? school['运费'] : 0; // 应付运费
                            var payment = total_amount - discount; // 优惠券折扣后金额，之后会更新为应付金额
                            payment += freight; // 应付金额 = 商品总价 + 运费
                            var now = (new Date().toLocaleTimeString('en-US', { hour12: false })).substr(0, 5);
                            school['交易时段'] = school['交易时段'].filter((elem) =>
                                now >= elem['下单时段']['开始时间'] && now <= elem['下单时段']['结束时间']
                            );
                            var deal_period = school['交易时段'].find((elem) =>
                                elem['配送时段']['开始时间'] === req.body['配送时段']['开始时间'] &&
                                elem['配送时段']['结束时间'] === req.body['配送时段']['结束时间']
                            );
                            if (school['交易时段'].length === 0 || !deal_period || !deal_period["配送时段"]) {
                                var errMsg = '不在下单时段内或者配送时段不合法';
                                console.log(errMsg, school['交易时段']);
                                res.json({ ok: false, errMsg: errMsg });
                                return;
                            }
                            var delivery_period = deal_period["配送时段"];

                            var order = new Order({
                                "创建时间": new Date(),
                                "买家openid": user.openid,
                                "配送地址": address,
                                "商品条目": cart_list,
                                "商品总价": total_amount.toFixed(2),
                                "运费": freight.toFixed(2),
                                "起送价": school['起送价'],
                                "支付金额": payment.toFixed(2),
                                "备注": req.body['备注'],
                                "配送时段": delivery_period,
                                "优惠券_id": coupon_id,
                            });
                            console.log('正在创建新订单:', order);
                            order.save((err, order) => {
                                if (err) {
                                    var errMsg = '下单失败: ' + err.toString();
                                    console.log(errMsg);
                                    res.json({ ok: false, errMsg: errMsg });
                                    return;
                                }
                                console.log('下单成功！订单信息已保存到数据库中!', order);

                                user['历史订单'].push(order._id);
                                user.save((err) => {
                                    if (err) {
                                        console.log('绑定订单到用户错误', err);
                                        return;
                                    }
                                    console.log('为相应用户绑定此订单成功');
                                });

                                // 大工程 不分函数了 强耦合
                                console.log('准备创建订单支付...');
                                var appid = config.appId;
                                var mch_id = config.mchId;
                                var nonce_str = utils.randomString();
                                var body = 'UE鲜果购物';
                                var spbill_create_ip = utils.getClientIp(req);
                                var openid = res.locals.openid;
                                var out_trade_no = order['_id'].toString(); // 用_id来作为唯一订单号
                                var total_fee = Math.floor(order['支付金额'] * 100); // 单位为分
                                var notify_url = config.serverUrl + config.paymentNotifyUrl;

                                // 根据 https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=4_3 方法签名
                                var stringA = 'appid=' + appid + '&body=' + body + '&mch_id=' + mch_id +
                                    '&nonce_str=' + nonce_str + '&notify_url=' + notify_url +
                                    '&openid=' + openid + '&out_trade_no=' + out_trade_no +
                                    '&spbill_create_ip=' + spbill_create_ip + '&total_fee=' + total_fee +
                                    '&trade_type=JSAPI';
                                var stringSignTemp = stringA + '&key=' + config.paymentKey;
                                var sign = utils.md5(stringSignTemp).toUpperCase();

                                var formData = {
                                    appid: appid,
                                    body: body,
                                    mch_id: mch_id,
                                    nonce_str: nonce_str,
                                    notify_url: notify_url,
                                    openid: openid,
                                    out_trade_no: out_trade_no,
                                    spbill_create_ip: spbill_create_ip, // 用户端ip
                                    sign: sign,
                                    total_fee: total_fee,
                                    trade_type: 'JSAPI',
                                };

                                var rawXml = new xml2js.Builder().buildObject(formData);
                                console.log("生成订单的XML：", rawXml);

                                var options = {
                                    url: 'https://api.mch.weixin.qq.com/pay/unifiedorder',
                                    method: 'POST',
                                    body: rawXml,
                                    headers: {
                                        'User-Agent': 'request',
                                        'Content-Type': 'text/xml',
                                    }
                                };

                                function closePaymentAndCancelOrder(order_id) {
                                    Order.findById(order_id, (err, order) => {
                                        if (err || !order) {
                                            console.error('出错了，订单号为', order_id);
                                            return;
                                        }
                                        if (order.订单状态 === "已完成" || order.订单状态 === "取消") {
                                            console.log('按时支付了订单，没有超时；或已成功取消订单');
                                            return;
                                        }

                                        // 尝试发送关闭微信支付请求
                                        console.log('准备关闭订单支付');
                                        var appid = config.appId;
                                        var mch_id = config.mchId;
                                        var nonce_str = utils.randomString();
                                        var out_trade_no = order._id.toString(); // 用_id来作为唯一订单号

                                        // 根据 https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=4_3 方法签名
                                        var stringA = 'appid=' + appid + '&mch_id=' + mch_id +
                                            '&nonce_str=' + nonce_str + '&out_trade_no=' + out_trade_no;
                                        var stringSignTemp = stringA + '&key=' + config.paymentKey;
                                        var sign = utils.md5(stringSignTemp).toUpperCase();

                                        var formData = {
                                            appid: appid,
                                            mch_id: mch_id,
                                            nonce_str: nonce_str,
                                            out_trade_no: out_trade_no,
                                            sign: sign,
                                        };

                                        var rawXml = new xml2js.Builder().buildObject(formData);
                                        console.log("取消订单的XML：", rawXml);

                                        // 把对应的noticeKey删掉
                                        console.log("删除noticeKey");
                                        NoticeKey.remove({ "订单id": out_trade_no });

                                        var options = {
                                            url: 'https://api.mch.weixin.qq.com/pay/closeorder',
                                            method: 'POST',
                                            body: rawXml,
                                            headers: {
                                                'User-Agent': 'request',
                                                'Content-Type': 'text/xml',
                                            }
                                        };

                                        request(options, (error, response, body) => {
                                            if (!error && response.statusCode == 200) {
                                                console.log('关闭支付的请求 发送成功！');
                                                xml2js.parseString(body, (err, result) => {
                                                    if (err || !result) {
                                                        console.log('解析返回的xml失败');
                                                        return;
                                                    }
                                                    if (result.return_code == 'SUCCESS') {
                                                        console.log('关闭支付成功 准备在数据库中设置订单状态为取消');
                                                        order.订单状态 = "取消";
                                                        order.save((err) => {
                                                            if (err) {
                                                                console.log('`因超时而取消订单`行为失败，订单号为', order_id);
                                                                return;
                                                            }
                                                            console.log('`因超时而去取消订单`成功，订单号为', order_id);
                                                        });
                                                    } else {
                                                        console.log(result.return_msg);
                                                    }
                                                });
                                            } else {
                                                console.log('关闭支付请求失败！');
                                                console.log(error);
                                            }
                                        });
                                    });
                                }

                                request(options, (error, response, body) => {
                                    if (!error && response.statusCode == 200) {
                                        console.log('统一下单请求发出！');
                                        xml2js.parseString(body, (err, xml_obj) => {
                                            if (err) {
                                                console.error('解析返回的xml失败');
                                                console.error(err);
                                                res.json({ ok: false });
                                                return;
                                            }
                                            var result = xml_obj.xml;
                                            if (result.return_code && result.return_code[0] === 'FAIL') {
                                                console.error("统一下单失败，微信支付返回的错误信息为：", result.return_msg);
                                                res.json({ ok: false, result: result });
                                                return;
                                            }
                                            console.dir(result);
                                            var prepay_id = result.prepay_id; // 用来发服务通知
                                            for (let i = 0; i < 3; i++) {
                                                var noticeKey = new NoticeKey({
                                                    "买家openid": user.openid,
                                                    "订单id": order._id.toString(),
                                                    "key": prepay_id,
                                                    "类型": "支付"
                                                });
                                                noticeKey.save((err) => {
                                                    if(err) {
                                                        console.log("保存noticeKey出错，我也很绝望");
                                                        console.log(err);
                                                    }
                                                });
                                            }
                                            res.json({ ok: true, result: result });
                                            console.log('成功发送订单支付，等待用户支付，七分钟内未完成订单则取消之');
                                            // 七分钟内未完成支付则取消
                                            setTimeout(closePaymentAndCancelOrder, 7 * 60 * 1000, out_trade_no);
                                        });
                                    } else {
                                        console.log('统一下单请求发出失败！');
                                        console.log(error);
                                        res.json({ ok: false });
                                        return;
                                    }
                                });
                            });
                        }

                        var coupon_id = req.body.优惠券_id;
                        if (coupon_id) {
                            Coupon.findById(coupon_id, (err, coupon) => {
                                if (err || !coupon) {
                                    var errMsg = "在数据库中查询优惠券失败";
                                    res.json({ ok: false, errMsg: errMsg });
                                    return;
                                }
                                if (!checkCouponIfIsSatisfiedAllRequirementSync(user.openid, products, cart_list, coupon)) {
                                    var errMsg = "优惠券不满足使用条件";
                                    res.json({ ok: false, errMsg: errMsg });
                                    return;
                                }
                                // 真正下单的地方：使用优惠券
                                makeOrder(coupon);
                            });
                        } else {
                            // 真正下单的地方：不使用优惠券
                            makeOrder();
                        }
                    });
                });
        });
    });
}); // 教科书般的回调地狱


// 用户查看 个人信息 --> 优惠券 的时候，通过header的code返回他的所有优惠券
// UPDATE: 同时会曝光所有返回的优惠券
router.get('/coupons_all', (req, res, next) => {
    Coupon.find({ "归属者openid": res.locals.openid }, (err, coupons) => {
        if (err || !coupons) {
            console.log("数据库查询出错");
            res.json({ ok: false });
            return;
        }
        var three_types_coupons = {
            '可用': [],
            '无效': [], // 已过期，找不到对应商品、类目等情况
            '未生效': [],
        };
        coupons.forEach((coupon) => {
            if (coupon.isAvailableSync()) {
                three_types_coupons.可用.push(coupon);
            } else if (coupon.hasNotReachedValidityTimeSync()) {
                three_types_coupons.未生效.push(coupon);
            } else {
                three_types_coupons.无效.push(coupon);
            }
        });
        res.json({ ok: true, coupons: three_types_coupons });

        // 曝光所有优惠券 
        coupons.forEach((coupon) => {
            coupon.已曝光 = true;
            coupon.save((err, coupon) => {
                if (err || !coupon) {
                    console.log("曝光优惠券失败");
                    return;
                }
                console.log("成功曝光优惠券" + coupon._id);
            })
        });
    });
});


// 通过header的code以及购物车内容，获取当前可用的优惠券。用于小程序端购物车选择优惠券操作
// UPDATE: 增加post参数 { ..., '曝光': bool }, 无此字段则不曝光
router.post('/coupons_useful', (req, res, next) => {
    if (!req.body['商品条目']) {
        var errMsg = '缺少"商品条目"(商品名为key购买量为value的object)';
        console.log(errMsg);
        res.json({ ok: false, errMsg: errMsg });
        return;
    }
    User.findOne({ openid: res.locals.openid }).exec((err, user) => {
        if (err || !user) {
            console.log('查询数据库出错', err);
            res.json({ ok: false });
            return;
        }
        var product_name_list = Object.keys(req.body['商品条目']);
        Product.find({ '商品名': { $in: product_name_list } })
            .select('商品名 单价 库存 在售 类目')
            .exec((err, products) => {
                if (err) {
                    console.log('查询数据库出错', err);
                    res.json({ ok: false });
                    return;
                }
                // 保证商品在售及库存足够的情况下 购物车才合法;
                for (let i = 0; i < products.length; i++) {
                    if (!products[i]['在售']) {
                        var errMsg = '商品' + products[i]['商品名'] + '已下架';
                        console.log(errMsg);
                        res.json({ ok: false, errMsg: errMsg });
                        return;
                    }
                }
                for (let i = 0; i < products.length; i++) {
                    if (products[i]['库存'] < req.body['商品条目'][products[i]['商品名']]) {
                        var errMsg = '商品' + products[i]['商品名'] + '库存不足';
                        console.log(errMsg);
                        res.json({ ok: false, errMsg: errMsg });
                        return;
                    }
                }
                // 构造要购买的商品列表
                var cart_list = products.map((elem) => {
                    return {
                        '商品名': elem['商品名'],
                        '单价': elem['单价'],
                        '数量': req.body['商品条目'][elem['商品名']],
                    }
                });
                console.log('购买列表：', cart_list);
                // // 没使用优惠券前的总价
                // var total_amount = cart_list.reduce((acc, item) => {
                //     return acc + item['单价'] * item['数量'];
                // }, 0);
                Coupon.find({ '归属者openid': user.openid }, (err, coupons) => {
                    if (err) {
                        console.log('数据库查询用户的优惠券失败', err);
                        res.json({ ok: false });
                        return;
                    }
                    var available_coupons = [];
                    var unavailable_coupons = [];
                    coupons.forEach((coupon) => {
                        if (checkCouponIfIsSatisfiedAllRequirementSync(user.openid, products, cart_list, coupon))
                            available_coupons.push(coupon);
                        else if (coupon.isAvailableSync())
                            unavailable_coupons.push(coupon);
                    });
                    res.json({ ok: true, coupons: { '可用': available_coupons, '不可用': unavailable_coupons } });

                    if (req.body.曝光 == true) {
                        // 曝光所有此时可用的优惠券 
                        available_coupons.forEach((coupon) => {
                            coupon.已曝光 = true;
                            coupon.save((err, coupon) => {
                                if (err || !coupon) {
                                    console.log("曝光优惠券失败");
                                    return;
                                }
                                console.log("成功曝光优惠券" + coupon._id);
                            })
                        });
                    }
                });
            });
    });
});


router.post('/coupons_info', (req, res, next) => {
    // 用户选择一张优惠券后，返回该优惠券可以减免的金额（不需要优惠券信息）
    // 如果不可使用，那么返回值里ok为false，没有 减免金额 一项。

    // 参数为购物车中的商品名（同上），以及优惠券id
    if (!req.body['商品条目'] || !req.body['优惠券_id']) {
        var errMsg = '缺少"商品条目"(商品名为key购买量为value的object)';
        console.log(errMsg);
        res.json({ ok: false, errMsg: errMsg });
        return;
    }
    var product_name_list = Object.keys(req.body['商品条目']);
    Product.find({ '商品名': { $in: product_name_list } })
        .select('商品名 单价 库存 在售 类目')
        .exec((err, products) => {
            if (err) {
                console.log('查询数据库出错', err);
                res.json({ ok: false });
                return;
            }
            // 保证商品在售及库存足够的情况下 购物车才合法;
            for (let i = 0; i < products.length; i++) {
                if (!products[i]['在售']) {
                    var errMsg = '商品' + products[i]['商品名'] + '已下架';
                    console.log(errMsg);
                    res.json({ ok: false, errMsg: errMsg });
                    return;
                }
            }
            for (let i = 0; i < products.length; i++) {
                if (products[i]['库存'] < req.body['商品条目'][products[i]['商品名']]) {
                    var errMsg = '商品' + products[i]['商品名'] + '库存不足';
                    console.log(errMsg);
                    res.json({ ok: false, errMsg: errMsg });
                    return;
                }
            }
            // 构造要购买的商品列表
            var cart_list = products.map((elem) => {
                return {
                    '商品名': elem['商品名'],
                    '类目': elem['类目'],
                    '单价': elem['单价'],
                    '数量': req.body['商品条目'][elem['商品名']],
                }
            });
            console.log('购买列表：', cart_list);
            Coupon.findById(req.body['优惠券_id'], (err, coupon) => {
                if (err || !coupon) {
                    console.log('数据库查询用户的优惠券失败', err);
                    res.json({ ok: false });
                    return;
                }
                // 先检查一下是否可用
                if (!checkCouponIfIsSatisfiedAllRequirementSync(res.locals.openid, products, cart_list, coupon)) {
                    var errMsg = "这个优惠券不满足条件啊";
                    console.log(errMsg);
                    res.json({ ok: false, errMsg: errMsg });
                    return;
                }
                var discount = getDiscountSync(cart_list, coupon);
                res.json({ ok: true, '减免金额': discount });
            });
        });
});

// UPDATE: 已被弃用，虽然可用
// 曝光一堆优惠券，post请求json内容为 { 优惠券_id列表:[ 'id123', 'qwert456', ... ] }
router.post('./expose_coupons', (req, res, next) => {
    Coupon.update({ _id: { $in: req.body.优惠券_id列表 } }, { '已曝光': true }, (err) => {
        if (err) {
            console.log('曝光优惠券失败，他们的_id列表为：', req.body.优惠券_id列表);
            res.json({ ok: false });
            return;
        }
        res.json({ ok: true });
    });
});

// api调用未成功匹配，即错误(事实上很少会到达这里)
router.all('/*', (req, res, next) => {
    res.json({ ok: false, code: 17, codeName: '虽然你有正确的身份验证但是我想说你api调用方式出错' });
});

module.exports = router;

