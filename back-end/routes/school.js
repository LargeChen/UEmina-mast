var express = require('express');
var router = express.Router();

var models = require('../models/models');
var School = models.School;

const 宿舍楼正则 = /^([^_]+)(?:_(男|女|未知))?$/;

router.route('/')
// 显示学校列表
.get((req, res, next) => {
    School.find().exec((err, schools) => {
        if (err) {
            console.log(err);
            res.send('数据库查询出错');
            return;
        }
        schools.forEach(school => {
            for (let i = 0; i < school.宿舍楼.length; i++) {
                if (school.宿舍楼性别[i] === "男" || school.宿舍楼性别[i] === "女") {
                    school.宿舍楼[i] += ("_" + school.宿舍楼性别[i]);
                }
            }
        });
        res.render('school', { schools: schools });
    });
})
// 删除学校信息
.delete((req, res, next) => {
    if (!req.body || !req.body['_id']) {
        res.json({ ok: false, code: 15, codeName: '请求body未携带待删除学校信息的id' });
        return;
    }
    var id = req.body['_id'];
    School.findByIdAndRemove(id, (err) => {
        if (err) {
            res.json({ ok: false, code: 16, codeName: '删除学校信息出错',
                       errMsgs: err.errors });
            return;
        }
        res.json({ ok: true });
    });
});


// 学校添加页
router.route('/new')
// 显示学校添加框等内容
.get((req, res, next) => {
    res.render('school_new');
})
// 添加学校
.post((req, res, next) => {
    if (!req.body) {
        res.json({ ok: false, code: 11, codeName: '请求body未携带待添加学校信息' });
        return;
    }
    var param = req.body;
    
    if (!req.body.宿舍楼.every(x => 宿舍楼正则.test(x))) {
        let errMsg = "请求body中的宿舍楼array里的element含有不合法的宿舍楼，即不符合 宿舍楼名称 或 宿舍楼名称_性别 的结构";
        console.log(errMsg);
        res.json({ ok: false, errMsg: errMsg });
        return;
    };
    let 宿舍楼名称列表 = param.宿舍楼.map(x => 宿舍楼正则.exec(x)[1]);
    let 宿舍楼性别列表 = param.宿舍楼.map(x => 宿舍楼正则.exec(x)[2] || "未知");
    param.宿舍楼 = 宿舍楼名称列表;
    param.宿舍楼性别 = 宿舍楼性别列表;
    console.log("将要做的新增学校，使用的是的param内容", param);

    var school = new School(param);
    school.save((err, school) => {
        if (err) {
            console.log(err);
            res.json({ ok: false, code: 12, codeName: '添加学校出错',
                       // 错误信息对象，{ 学校键(e.g.学校名): 出错原因 }
                       // `出错原因.message`即为出错信息
                       errMsgs: err.errors });
            return;
        }
        console.log('成功添加学校' + school['学校名']);
        res.json({ ok: true });
    });
});


// 学校信息修改页
router.route('/update')
.get((req, res, next) => {
    if (!req.query || !req.query['_id']) {
        res.json({ ok: false, code: 19, codeName: '请求body未携带待修改学校id' });
        return;
    }
    var id = req.query['_id'];
    School.findById(id, (err, school) => {
        if (err || !school) {
            res.send("未找到满足条件的School：id = " + id);
            return;
        }
        for (let i = 0; i < school.宿舍楼.length; i++) {
            if (school.宿舍楼性别[i] === "男" || school.宿舍楼性别[i] === "女") {
                school.宿舍楼[i] += ("_" + school.宿舍楼性别[i]);
            }
        }
        res.render('school_update', { school: school });
    });
})
.post((req, res, next) => {
    if (!req.body || !req.body['_id']) {
        res.json({ ok: false, code: 13, codeName: '请求body未携带待修改学校id' });
        return;
    }
    var id = req.body['_id'];
    var update = req.body;
    
    if (!req.body.宿舍楼.every(x => 宿舍楼正则.test(x))) {
        let errMsg = "请求body中的宿舍楼array里的element含有不合法的宿舍楼，即不符合 宿舍楼名称 或 宿舍楼名称_性别 的结构";
        console.log(errMsg);
        res.json({ ok: false, errMsg: errMsg });
        return;
    };
    let 宿舍楼名称列表 = update.宿舍楼.map(x => 宿舍楼正则.exec(x)[1]);
    let 宿舍楼性别列表 = update.宿舍楼.map(x => 宿舍楼正则.exec(x)[2] || "未知");
    update.宿舍楼 = 宿舍楼名称列表;
    update.宿舍楼性别 = 宿舍楼性别列表;
    console.log("将要做的修改学校信息的update内容", update);
    School.findByIdAndUpdate(id, update, (err) => {
        if (err) {
            console.log(err);
            res.json({ ok: false, code: 14, codeName: '修改学校信息出错', 
                       errMsgs: err.errors });
            return;
        }
        console.log('成功修改学校');
        res.json({ ok: true });
    });
});

module.exports = router;
