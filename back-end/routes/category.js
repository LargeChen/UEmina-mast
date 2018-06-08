var express = require('express');
var router = express.Router();

var models = require('../models/models');
var Category = models.Category;

router.get('/', (req, res, next) => {
    Category.find().sort({'权重': 'desc'}).exec((err, categories) => {
        if (err) {
            console.log(err);
            res.send('数据库查询出错');
            return;
        }
        res.render('category', {categories: categories});
    });
});

router.get('/get', (req, res, next) => {
    Category.find().sort({'权重': 'desc'}).exec((err, categories) => {
        if (err) {
            console.log(err);
            res.send('数据库查询出错');
            return;
        }
        res.json(categories);
    });
});

router.post('/', (req, res, next) => {
    if (!req.body) {
        res.json({ ok: false, code: 20, codeName: '未携带类目信息' });
        return;
    }
    if (req.body['_id']) {
        // 修改类目
        var id = req.body['_id'];
        var update = req.body;
        Category.findByIdAndUpdate(id, update, (err, category) => {
            if (err) {
                console.log('修改类目失败');
                res.json({ ok: false, code: 21, codeName: '修改类目失败' });
                return;
            }
            res.json({ ok: true });
        });
    } else {
        // 新增类目
        var category = new Category(req.body);
        category.save((err) => {
            if (err) {
                console.log('新增类目失败');
                res.json({ ok: false, code: 22, codeName: '新增类目失败',
                           errMsgs: err.errors });
                return;
            }
            res.json({ ok: true });
        });
    }
});


////////
//////// TODO：删除要把所有该类目下的商品变成“未分类”
////////   因此可能需要一个“未分类”的类目，权重为0之类的
////////
router.delete('/', (req, res, next) => {
    if (!req.body || !req.body['_id']) {
        res.json({ ok: false, code: 23, codeName: '未携带待删除类目信息' });
        return;
    }
    var id = req.body['_id'];
    Category.findByIdAndRemove(id, (err) => {
        if (err) {
            res.json({ ok: false, code: 24, codeName: '删除类目出错',
                       errMsgs: err.errors });
            return;
        }
        res.json({ ok: true });
    });
});

module.exports = router;