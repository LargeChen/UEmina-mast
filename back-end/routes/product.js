var express = require('express');
var router = express.Router();

var models = require('../models/models');
var Product = models.Product;
var Category = models.Category;

var fs = require('fs');
var path = require('path');
var config = require('../config');
var utils = require('../utils');

// 用于删除非空路径
var rimraf = require('rimraf');

// 商品页，显示商品列表
router.route('/')
    .get((req, res, next) => {
        // 按权重从大到小排序
        Product.find().sort({ "权重": 'desc' }).exec((err, products) => {
            if (err) {
                console.log(err);
                res.send('数据库查询出错');
                return;
            }
            Category.find().exec((err, elems) => {
                var categories = {};
                elems.forEach((elem) => {
                    categories[elem['类目名']] = elem['权重'];
                });
                // console.log(categories);
                var product_classified = {
                    在售: {},
                    售罄: {},
                    下架: {},
                }
                // 若不存在此类目或类目为空时，类目字符串为`未分类`
                products.forEach((product) => {
                    if (!product['类目'] || !(product['类目'] in categories)) {
                        product['类目'] = '未分类';
                    }
                    if (product.在售 === false) {
                        if (!product_classified['下架'][product['类目']]) {
                            product_classified['下架'][product['类目']] = [];
                        }
                        product_classified['下架'][product['类目']].push(product);
                    } else if (product.库存 === 0) {
                        if (!product_classified['售罄'][product['类目']]) {
                            product_classified['售罄'][product['类目']] = [];
                        }
                        product_classified['售罄'][product['类目']].push(product);
                    } else if (product.库存 > 0) {
                        if (!product_classified['在售'][product['类目']]) {
                            product_classified['在售'][product['类目']] = [];
                        }
                        product_classified['在售'][product['类目']].push(product);
                    }
                });
                // console.log(product_classified);
                res.render('product', { product_classified: product_classified });
            });
        });
    })
    // 删除商品
    .delete((req, res, next) => {
        if (!req.body || !req.body['_id']) {
            res.json({ ok: false, code: 8, codeName: '请求body未携带待删除商品id' });
            return;
        }
        var id = req.body['_id'];
        Product.findByIdAndRemove(id, (err, product) => {
            console.log('删除商品: ', product);
            if (err) {
                res.json({
                    ok: false, code: 9, codeName: '删除商品出错',
                    errMsgs: err.errors
                });
                return;
            }
            // 删除对应的存详情图、缩略图的图片文件夹
            var imgPath = path.join(config.productImagesFilePath, product.id);
            rimraf(imgPath, (err) => {
                if (err) {
                    console.log('删除商品对应的图片文件夹失败');
                    console.error(err);
                    return;
                }
                console.log('成功删除商品对应文件夹');
            });
            res.json({ ok: true });
        });
    });


// 商品创建页
router.route('/new')
    // 显示商品创建框等内容
    .get((req, res, next) => {
        // 每次请求创建商品都先把候选文件夹内的东西清空以供其上传图片使用
        console.log('准备清空' + config.uploadedImagePath);
        rimraf(config.uploadedImagePath, () => { console.log('清空候选图文件夹') });
        Category.find().sort({ '权重': -1 }).exec((err, categories) => {
            if (err) throw err;
            res.render('product_new', { categories: categories });
        });
    })
    // 创建商品
    .post((req, res, next) => {
        if (!req.body) {
            res.json({ ok: false, code: 6, codeName: '请求body未携带待创建商品信息' });
            return;
        }
        req.body['单价'] = (req.body['单价'] || 0);
        var product = new Product(req.body);
        product.save((err, product) => {
            if (err) {
                res.json({
                    ok: false, code: 7, codeName: '创建商品出错',
                    // 错误信息对象，{ 商品键(e.g.名称): 出错原因 }
                    // `出错原因.message`即为出错信息
                    errMsgs: err.errors
                });
                return;
            }
            // 转移临时候选图到对应商品_id的图片的文件夹里
            var imgPath = path.join(config.productImagesFilePath, product.id);
            utils.promiseDirExists(imgPath);
            var imgs = product['缩略图'].concat(product['详情图']);
            for (var i in imgs) {
                var imgName = imgs[i];
                var src = path.join(config.uploadedImagePath, imgName);
                var dist = path.join(imgPath, imgName);
                if (!fs.existsSync(src)) {
                    console.log('不存在临时候选图，这不可能！！！！');
                    res.status(422).json({ ok: false });
                    return;
                }
                utils.fsRename(src, dist, (err) => {
                    if (err) throw err;
                    console.log('成功转移图片' + imgName + '到对应商品_id的文件夹里');
                });
            }
            res.json({ ok: true });
        });
    });


// 商品修改页
router.route('/update')
    .get((req, res, next) => {
        var _id = req.query._id;
        Product.findById(_id).exec((err, product) => {
            if (err || !product) {
                res.send("未找到满足条件的Product：id = " + _id);
                return;
            }
            console.log('准备清空' + config.uploadedImagePath);
            rimraf(config.uploadedImagePath, () => {
                console.log('清空候选图文件夹')
            });
            Category.find().sort({ '权重': -1 }).exec((err, categories) => {
                if (err) throw err;
                res.render('product_update', { product: product, categories: categories });
            });
        });
    })
    .post((req, res, next) => {
        if (!req.body || !req.body['_id']) {
            res.json({ ok: false, code: 5, codeName: '请求body未携带待修改商品信息' });
            return;
        }
        var id = req.body['_id'];
        var update = req.body;
        Product.findByIdAndUpdate(id, update, (err, product) => {
            if (err) {
                res.json({
                    ok: false, code: 4, codeName: '修改商品出错',
                    errMsgs: err.errors
                });
                return;
            }
            // 转移临时候选图到对应商品_id的图片的文件夹里
            var imgPath = path.join(config.productImagesFilePath, id);
            utils.promiseDirExists(imgPath);
            var imgs = (update['缩略图'] || []).concat(update['详情图'] || []);
            for (var i in imgs) {
                var imgName = imgs[i];
                var src = path.join(config.uploadedImagePath, imgName);
                var dist = path.join(imgPath, imgName);
                if (!fs.existsSync(src)) {
                    console.log('不存在临时候选图，本应存在' + src);
                    res.status(422).json({ ok: false });
                    return;
                }
                fs.renameSync(src, dist);
                console.log('成功转移图片' + imgName + '到对应商品_id的文件夹里');
            }
            res.json({ ok: true });
        });
    });


router.route('/reset_inventory')
    .post((req, res, next) => {
        console.log("开始重置所有默认库存！");
        Product.find({ '重置开关': true }).exec((err, products) => {
            if (err) {
                console.log(err);
                res.send('数据库查询出错');
                return;
            }
            products.forEach((product) => {
                Product.findByIdAndUpdate(product.id, { 库存: product.默认库存 }, (err, product) => {
                    if(err) {
                        res.json({
                            ok: false, code: 4, codeName: '修改商品出错',
                            errMsgs: err.errors
                        });
                        return;
                    }
                });
            });
        });
        res.json({ ok: true });
    });

module.exports = router;
