var express = require('express');
var router = express.Router();

var utils = require('../utils');
var models = require('../models/models');
var Order = models.Order;
var User = models.User;
var School = models.School;
var Coupon = models.Coupon;

var async = require('async');

/////////////////////////////////
//   （当天订单）统计页
/////////////////////////////////
router.route('/')
  .get((req, res, next) => {

    // 统计分析数据库中的订单形成下述格式的json object
    function ordersAnalysis(orders) {
      var totalAnalysis = {
        '统计日期': (new Date().toLocaleDateString()),
        '订单总数': 0,
        '营业总额': 0,
        '客单价': 0,
        '详细数据': [],
        '优惠券数': 0,
        '优惠券总额': 0
      };
      orders.forEach((order) => {
        totalAnalysis['订单总数']++;
        totalAnalysis['营业总额'] += order['支付金额'];
        totalAnalysis['客单价'] = (totalAnalysis['营业总额'] / totalAnalysis['订单总数']).toFixed(2);
        if(order['优惠券_id']) {
          totalAnalysis['优惠券数']++;
          totalAnalysis['优惠券总额'] += order['商品总价'] + order['运费'] - order['支付金额'];
        }

        var schoolAnalysis = totalAnalysis['详细数据'].find((element) =>
          order['配送地址']['学校'] === element['学校']);
        if (!schoolAnalysis) {
          var newSchoolAnalysis = {
            '学校': order['配送地址']['学校'],
            '订单总数': 0,
            '营业总额': 0,
            '客单价': 0,
            '详细数据': [],
            '优惠券数': 0,
            '优惠券总额': 0
          };
          var len = totalAnalysis['详细数据'].push(newSchoolAnalysis);
          schoolAnalysis = totalAnalysis['详细数据'][len - 1];
        }

        schoolAnalysis['订单总数']++;
        schoolAnalysis['营业总额'] += order['支付金额'];
        schoolAnalysis['客单价'] = (schoolAnalysis['营业总额'] / schoolAnalysis['订单总数']).toFixed(2);
        if (order['优惠券_id']) {
          schoolAnalysis['优惠券数']++;
          schoolAnalysis['优惠券总额'] += order['商品总价'] + order['运费'] - order['支付金额'];
        }

        var buildingAnalysis = schoolAnalysis['详细数据'].find((element) =>
          order['配送地址']['宿舍楼'] === element['宿舍楼']);
        if (!buildingAnalysis) {
          var newBuildingAnalysis = {
            '宿舍楼': order['配送地址']['宿舍楼'],
            '订单总数': 0,
            '营业总额': 0,
            '客单价': 0,
            '优惠券数': 0,
            '优惠券总额': 0
          };
          var len = schoolAnalysis['详细数据'].push(newBuildingAnalysis);
          buildingAnalysis = schoolAnalysis['详细数据'][len - 1];
        }

        buildingAnalysis['订单总数']++;
        buildingAnalysis['营业总额'] += order['支付金额'];
        buildingAnalysis['客单价'] = (buildingAnalysis['营业总额'] / buildingAnalysis['订单总数']).toFixed(2);
        if (order['优惠券_id']) {
          buildingAnalysis['优惠券数']++;
          buildingAnalysis['优惠券总额'] += order['商品总价'] + order['运费'] - order['支付金额'];
        }
      });
      return totalAnalysis;
    }

    function productsAnalysis(orders) {
      var totalAnalysis = {
        '统计日期': (new Date().toLocaleDateString()),
        '详细数据': []
      };
      orders.forEach((order) => {
        order.商品条目.forEach((商品信息) => {
          var productAnalysis = totalAnalysis['详细数据'].find((element) => 商品信息.商品名 === element.商品名);
          if (!productAnalysis) {
            var newProductAnalysis = {
              '商品名': 商品信息.商品名,
              '销量': 0,
            };
            var len = totalAnalysis['详细数据'].push(newProductAnalysis);
            productAnalysis = totalAnalysis['详细数据'][len - 1];
          }
          productAnalysis.销量 += 商品信息.数量;
        });
      });
      return totalAnalysis;
    }

    // 确保两个数据库查询都完成了再返回结果
    // 并行查询
    async.parallel({
      // 查询订单
      orders: (done) => {
        var today = new Date((new Date().toDateString()));
        var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
        Order.find({ '订单状态': '完成' })
          .where('完成时间').gte(today).lt(tomorrow)
          .exec((err, ors) => {
            if (err) {
              console.log(err);
              done(err, null);
              return;
            }
            // 返回结果
            console.log(ors.length);
            var order = ordersAnalysis(ors);
            var product = productsAnalysis(ors);
            var tmp = { order: order, product: product };
            console.log(tmp);
            done(null, tmp);
          });
      },
      schools: (done) => {
        School.find().exec((err, scs) => {
          if (err) {
            console.log(err);
            done(err, null);
            return;
          }
          // 返回结果
          done(null, scs);
        });
      }
    }, (err, result) => { // 上面的操作都进行完的回调函数
      `
      // result.orders的具体json格式
      {
        '统计日期': '2017-01-23',
        '订单总数': 9876,
        '营业总额': 135790,
        '客单价': 8.50,
        '详细数据': [
        {
          '学校': '中山大学',
          '订单总数': 1234,
          '营业总额': 12345,
          '客单价': 6.13,
          '详细数据': [
          {
            '宿舍楼': '慎思园6号',
            '订单总数': 1000,
            '营业总额': 9000,
            '客单价': 9.00, 
          },
          ...
          ]
        },
        ...
        ]
      }
      `
      if (!err) {
        res.render('statistic', {
          orders: result.orders,
          schools: result.schools
        });
      } else {
        res.send('数据库查询出错');
      }
    });
  });


/////////////////////////////////
//   新（订单）统计页
/////////////////////////////////

// 浏览器 POST /statistic/order
// 请求参数有：
// req.body["开始时间"]: "yyyy-MM-dd"
// req.body["结束时间"]: "yyyy-MM-dd"
// req.body["待统计单位"]: 
//   {
//     '合计': {}
//   }
//   OR
//   {
//     '中大': {
//       '合计': undefined,
//       '明一': {},
//       '至二': {}
//     },
//     '广中医': {
//       '合计': {},
//     }
//   }
// 注意宿舍楼或学校的名字不能为"合计"
router.post('/order', (req, res, next) => {
  if (!req.body || !req.body['结束时间'] || !req.body['开始时间'] || !req.body['待统计单位']) {
    res.json({
      ok: false, errMsg: '请求queryString未携带参数"开始时间", "结束时间"或"待统计单位"'
    });
    return;
  }
  let 开始日期 = new Date(req.body["开始时间"]);
  let 结束日期 = new Date(req.body["结束时间"]);
  if (utils.isInvalidDate(开始日期) || utils.isInvalidDate(结束日期)) {
    res.json({ ok: false, errMsg: '开始时间或结束时间不是合法日期yyyy-MM-dd' });
    return;
  }

  function ordersAnalysis(start_date, end_date, statistic_units, callback) {
    let 开始日期 = start_date;
    let 结束日期 = end_date;
    let 待统计单位 = Object.assign({}, statistic_units);
    let 结束日期的后一天 = utils.getNextSeveralDay(结束日期, 1);

    let 待统计订单的查询条件 = { '订单状态': '完成', '完成时间': { $gte: 开始日期, $lt: 结束日期的后一天 } };

    // 很鸡儿复杂老哥
    if (待统计单位.合计) {
      /* do nothing */
    } else {
      待统计订单的查询条件.$or = [];
      let 待统计的学校列表 = Object.keys(待统计单位);
      let 待统计的宿舍楼合计的学校列表 = [];
      待统计的学校列表.forEach(待统计的学校 => {
        if (待统计单位[待统计的学校].合计) {
          待统计的宿舍楼合计的学校列表.push(待统计的学校);
        } else {
          let 待统计的宿舍楼列表 = Object.keys(待统计单位[待统计的学校]);
          待统计订单的查询条件.$or.push({
            '配送地址.学校': 待统计的学校,
            '配送地址.宿舍楼': { $in: 待统计的宿舍楼列表 }
          });
        }
      });
      待统计订单的查询条件.$or.push({
        '配送地址.学校': { $in: 待统计的宿舍楼合计的学校列表 },
      });
    }

    // 查询订单
    Order.find(待统计订单的查询条件, (err, orders) => {
      if (err) {
        console.log(err);
        res.json({ ok: false, errMsg: err.message });
        return;
      }
      console.log(orders.length);
      // 返回结果
      let results = {};
      `
    // 统计分析数据库中的订单形成下述格式的json object 'results'
    {
      '合计': {
        '开始日期': '2017-05-12',
        '结束日期': '2017-06-23',
        '订单数': 100,
        '销售总额': 1132,
        '客单价': 1.132,
        '下单用户数': 80,
        '平均单数': 1.25,
      }
    }
    OR
    {
      '中大': {
        '合计': undefined,
        '明一': {
          '开始日期': '2017-05-12',
          '结束日期': '2017-06-23',
          '订单数': 100,
          '销售总额': 1132,
          '客单价': 1.132,
          '下单用户数': 80,
          '平均单数': 1.25,
        },
        '至二': {
          '开始日期': '2017-05-12',
          '结束日期': '2017-06-23',
          '订单数': 100,
          '销售总额': 1132,
          '客单价': 1.132,
          '下单用户数': 80,
          '平均单数': 1.25,
        }
      },
      '广中医': {
        '合计': {
          '开始日期': '2017-05-12',
          '结束日期': '2017-06-23',
          '订单数': 100,
          '销售总额': 1132,
          '客单价': 1.132,
          '下单用户数': 80,
          '平均单数': 1.25,
        },
      }
    }
    `
      // 利用构造子InitObj初始化results对象中的每一个统计单位
      function InitObj() {
        this.开始日期 = utils.dateToyyyyMMddString(开始日期);
        this.结束日期 = utils.dateToyyyyMMddString(结束日期);
        this.订单数 = 0;
        this.销售总额 = 0;
        this.客单价 = 0;
        this.下单用户openid集合 = new Set;
        this.下单用户数 = 0;
        this.平均单数 = 0;
      };

      if (待统计单位.合计) {
        results.合计 = new InitObj;
      } else {
        for (let 待统计的学校 in 待统计单位) {
          results[待统计的学校] = {};
          if (待统计单位[待统计的学校].合计) {
            results[待统计的学校].合计 = new InitObj;
          } else {
            for (let 待统计的宿舍楼 in 待统计单位[待统计的学校]) {
              results[待统计的学校][待统计的宿舍楼] = new InitObj;
            }
          }
        }
      }

      orders.forEach((order) => {
        let 统计单位;
        if (results.合计) {
          统计单位 = results.合计;
        } else {
          let 学校 = order.配送地址.学校;
          if (results[学校].合计) {
            统计单位 = results[学校].合计;
          } else {
            let 宿舍楼 = order.配送地址.宿舍楼;
            统计单位 = results[学校][宿舍楼];
          }
        }

        统计单位.订单数++;
        统计单位.销售总额 = 统计单位.销售总额 + order.支付金额;
        统计单位.客单价 = 统计单位.订单数 === 0 ? 0 : (统计单位.销售总额 / 统计单位.订单数);
        统计单位.下单用户openid集合.add(order.买家openid);
        统计单位.下单用户数 = 统计单位.下单用户openid集合.size;
        统计单位.平均单数 = 统计单位.下单用户数 === 0 ? 0 : (统计单位.订单数 / 统计单位.下单用户数);
      });

      let results_in_rows = [];
      ` results_in_rows 的格式为
    [
      {
        '学校': '中大',
        '宿舍楼': '明一',
        '开始日期': '2017-05-12',
        '结束日期': '2017-06-23',
        '订单数': 100,
        '销售总额': 1132,
        '客单价': 1.132,
        '下单用户数': 80,
        '平均单数': 1.25,
      },
      {
        '学校': '中大',
        '宿舍楼': '至二',
        '开始日期': '2017-05-12',
        '结束日期': '2017-06-23',
        '订单数': 10,
        '销售总额': 2132,
        '客单价': 21.32,
        '下单用户数': 1,
        '平均单数': 10,
      },
      {
        '学校': '广中医',
        '宿舍楼': '合计',
        '开始日期': '2017-05-12',
        '结束日期': '2017-06-23',
        '订单数': 10,
        '销售总额': 2132,
        '客单价': 21.32,
        '下单用户数': 1,
        '平均单数': 10,
      },
      // ...
    ]
    `
      // results转化为row(result) list
      if (results.合计) {
        results_in_rows.push({
          '学校': '合计',
          '宿舍楼': '合计',
          '开始日期': results.合计.开始日期,
          '结束日期': results.合计.结束日期,
          '订单数': results.合计.订单数,
          '销售总额': results.合计.销售总额.toFixed(2),
          '客单价': results.合计.客单价.toFixed(2),
          '下单用户数': results.合计.下单用户数,
          '平均单数': results.合计.平均单数.toFixed(2),
        });
      } else {
        for (let 待统计的学校 in results) {
          if (results[待统计的学校].合计) {
            results_in_rows.push({
              '学校': 待统计的学校,
              '宿舍楼': '合计',
              '开始日期': results[待统计的学校].合计.开始日期,
              '结束日期': results[待统计的学校].合计.结束日期,
              '订单数': results[待统计的学校].合计.订单数,
              '销售总额': results[待统计的学校].合计.销售总额.toFixed(2),
              '客单价': results[待统计的学校].合计.客单价.toFixed(2),
              '下单用户数': results[待统计的学校].合计.下单用户数,
              '平均单数': results[待统计的学校].合计.平均单数.toFixed(2),
            });
          } else {
            for (let 待统计的宿舍楼 in results[待统计的学校]) {
              results_in_rows.push({
                '学校': 待统计的学校,
                '宿舍楼': 待统计的宿舍楼,
                '开始日期': results[待统计的学校][待统计的宿舍楼].开始日期,
                '结束日期': results[待统计的学校][待统计的宿舍楼].结束日期,
                '订单数': results[待统计的学校][待统计的宿舍楼].订单数,
                '销售总额': results[待统计的学校][待统计的宿舍楼].销售总额.toFixed(2),
                '客单价': results[待统计的学校][待统计的宿舍楼].客单价.toFixed(2),
                '下单用户数': results[待统计的学校][待统计的宿舍楼].下单用户数,
                '平均单数': results[待统计的学校][待统计的宿舍楼].平均单数.toFixed(2),
              });
            }
          }
        }
      }
      typeof callback === "function" && callback(null, results_in_rows);
    });
  }

  function getAllRelatedOrders(start_date, end_date, statistic_units, callback) {
    let 开始日期 = start_date;
    let 结束日期 = end_date;
    let 待统计单位 = Object.assign({}, statistic_units);
    let 结束日期的后一天 = utils.getNextSeveralDay(结束日期, 1);

    let 待统计订单的查询条件 = { '订单状态': '完成', '完成时间': { $gte: 开始日期, $lt: 结束日期的后一天 } };

    // 很鸡儿复杂老哥
    if (待统计单位.合计) {
      /* do nothing */
    } else {
      待统计订单的查询条件.$or = [];
      let 待统计的学校列表 = Object.keys(待统计单位);
      let 待统计的宿舍楼合计的学校列表 = [];
      待统计的学校列表.forEach(待统计的学校 => {
        if (待统计单位[待统计的学校].合计) {
          待统计的宿舍楼合计的学校列表.push(待统计的学校);
        } else {
          let 待统计的宿舍楼列表 = Object.keys(待统计单位[待统计的学校]);
          待统计订单的查询条件.$or.push({
            '配送地址.学校': 待统计的学校,
            '配送地址.宿舍楼': { $in: 待统计的宿舍楼列表 }
          });
        }
      });
      待统计订单的查询条件.$or.push({
        '配送地址.学校': { $in: 待统计的宿舍楼合计的学校列表 },
      });
    }

    let results_in_detials = []; // a row list

    Order.find(待统计订单的查询条件, (err, orders) => {
      if (err) {
        (typeof callback === "function") && callback(err);
        return;
      }
      Coupon.find({ _id: { $in: orders.map(x => x.优惠券_id).filter(x => x) } }, (err, coupons) => {
        if (err) throw err;
        let coupons_table = new Map;
        coupons.forEach(x => coupons_table.set(x._id.toString(), x.getNameSync()));
        let count = 0;
        orders.forEach(order => {
          School.findOne({ "学校名": order.配送地址.学校 }).exec((err, school) => {
            if (err) throw err;
            console.log("准备塞入一行，其中性别为", utils.getBuildingGender(school, order.配送地址.宿舍楼));

            results_in_detials.push({
              '时间': utils.dateToyyyyMMddString(utils.getThatDay(order.完成时间)),
              '学校': order.配送地址.学校,
              '宿舍楼': order.配送地址.宿舍楼,
              '名字': order.配送地址.姓名,
              '性别': (school.宿舍楼 && order.配送地址.宿舍楼) ? utils.getBuildingGender(school, order.配送地址.宿舍楼) : "无相关信息",
              '电话': order.配送地址.电话,
              '配送时间': order.配送时段.开始时间 + '-' + order.配送时段.结束时间,
              '金额': order.支付金额,
              '用券情况': order.优惠券_id ? coupons_table.get(order.优惠券_id.toString()) : '无',
              'openid': order.买家openid,
            });

            count++;

            if (count === orders.length) {
              (typeof callback === "function") && callback(null, results_in_detials);
            }
          });
        });
      });
    });
  }

  async.parallel({
    statistic_units: (done) => {
      let statistic_units = {};
      School.find((err, schools) => {
        if (err) throw err;
        schools.forEach(school => {
          statistic_units[school.学校名] = {}
          school.宿舍楼.forEach(宿舍楼名称 => statistic_units[school.学校名][宿舍楼名称] = {});
        });
        done(null, statistic_units);
      });
    }
  }, (err, results) => {
    if (err) throw err;

    let 待统计单位 = JSON.parse(req.body["待统计单位"]);
    console.log("待统计单位为", 待统计单位)
    // 表示统计所有学校的所有宿舍楼
    if (待统计单位.全选) {
      待统计单位 = results.statistic_units;
      console.log("statistic_units为", results.statistic_units);
    }

    let result = {
      result_total: [],
      results_everyday: {},
      results_everyorder: [],
    };

    // 左闭右闭
    function analyzeSomeDays(start_date, end_data, callback) {
      if (start_date > end_data) {
        console.log("结束递归！", typeof callback, typeof callback === "function");
        (typeof callback === "function") && callback();
        return;
      }
      let 某天 = start_date;
      ordersAnalysis(某天, 某天, 待统计单位, (err, result_someday) => {
        if (err) (typeof callback === "function") && callback(err);
        console.log("分析完" + 某天 + "那一天了！");
        result.results_everyday[utils.dateToyyyyMMddString(某天)] = result_someday;
        analyzeSomeDays(utils.getNextSeveralDay(start_date, 1), end_data, callback);
      });
    }

    console.log("准备开始分析！");

    ordersAnalysis(开始日期, 结束日期, 待统计单位, (err, result_total) => {
      if (err) throw err;
      result.result_total = result_total;
      console.log("分析一段时间完成！");
      analyzeSomeDays(开始日期, 结束日期, (err) => {
        console.log("EveryDay统计完成！result填充完成: ");
        getAllRelatedOrders(开始日期, 结束日期, 待统计单位, (err, results_in_detials) => {
          result.results_everyorder = results_in_detials;
          console.log(JSON.stringify(result));
          res.render('subviews/statistic_order_sub', { result: result });
        });
      });
    });
  });
});

/////////////////////////////////
//   （用户）统计页
/////////////////////////////////
router.get('/user', (req, res, next) => {
  if (!req.query || !req.query['学校'] || !req.query['宿舍楼']) {
    res.json({
      ok: false, code: 28,
      codeName: '请求queryString未携带参数"学校"或"宿舍楼"'
    });
    return;
  }
  var school = req.query['学校'], building = req.query['宿舍楼'];

  User.find({ '地址.学校': school, '地址.宿舍楼': building })
    .exec((err, users) => {
      if (err) {
        console.log(err);
        res.send('数据库查询出错');
        return;
      }
      // 直接返回按历史消费额降序的 users 的数组
      // [
      //   {
      //     '姓名': '小明',
      //     '宿舍号': '328',
      //     '电话': '13902301191',
      //     '历史消费总额': 1024
      //   }
      // ]

      // 保证你看不懂
      // 递归计算历史消费总额，保证为所有用户算完后再render
      function countAllUsersTotal(users, index, callback) {
        if (index >= users.length) {
          typeof callback === 'function' && callback();
          return;
        }
        var user = users[index];
        Order.find({ _id: { $in: user['历史订单'] } }, (err, orders) => {
          if (err) throw err;
          user['历史消费总额'] = (orders.map((order) => order['支付金额'])
            .reduce((a, b) => a + b, 0)).toFixed(2);
          countAllUsersTotal(users, index + 1, callback);
        });
      }

      countAllUsersTotal(users, 0, () => {
        res.render('subviews/statistic_user_sub',
          { users: users.length ? usersAnalysis(users)[school][building] : [] });
      });
    });
});

`
// 浏览器 GET /statistic/user 返回的json具体格式
{
  '中山大学': {
    '慎思园6号': [
    {
      '姓名': '小明',
      '宿舍号': '328',
      '电话': '13902301191',
      '历史消费总额': 1024
    }
    ],
    ...
  },
  '华南理工大学': {
    ...
  },
  ...
}
`

// 统计分析数据库中的 用户 形成上述格式的json object
function usersAnalysis(users) {
  var result = {};
  users.forEach((user) => {
    var userSchool = user['地址']['学校'];
    var userBuilding = user['地址']['宿舍楼'];
    if (!(userSchool in result))
      result[userSchool] = {};
    if (!(userBuilding in result[userSchool]))
      result[userSchool][userBuilding] = [];
    result[userSchool][userBuilding].push({
      '姓名': user['地址']['姓名'],
      '宿舍号': user['地址']['宿舍号'],
      '电话': user['地址']['电话'],
      '历史消费总额': user['历史消费总额']
    });
  });
  // 同一栋宿舍楼的用户按照金额从大到小排序
  for (var school in result) {
    for (var building in result[school]) {
      result[school][building].sort((a, b) => {
        var x = a['历史消费总额'];
        var y = b['历史消费总额'];
        if (x < y) return -1;
        if (x > y) return 1;
        return 0;
      });
    }
  }
  return result;
}


/////////////////////////////////
//   用户分析页（新版）
/////////////////////////////////

// 和旧版区别在于post 不要问我为什么这么设计 我就是来搞事的
router.post('/user', (req, res, next) => {
  console.log(req.body);
  if (!req.body || !req.body['学校'] || (req.body['学校'] !== "合计" && !req.body['宿舍楼']) || !req.body['收入维度'] || !req.body['时间基准']) {
    let errMsg = "请求body未携带参数`学校`或`宿舍楼`或`收入维度`或`时间基准`";
    res.json({ ok: false, errMsg: errMsg });
    return;
  }

  let date_base = req.body['时间基准'];
  let school = req.body['学校'];
  let dormitory = req.body['宿舍楼'];
  let dimension = req.body['收入维度'];

  console.log("统计：" + date_base + " " + school + " " + dormitory + " " + dimension);

  const thatDay = new Date(date_base);
  const SevenDaysBeforeThatDay = utils.getNextSeveralDay(thatDay, -7);
  const FourteenDaysBeforeThatDay = utils.getNextSeveralDay(thatDay, -14);
  const ThirtyDaysBeforeThatDay = utils.getNextSeveralDay(thatDay, -30);

  let 订单查询条件 = { '订单状态': '完成' };

  if (dimension === "7日") {
    订单查询条件['完成时间'] = { $gte: SevenDaysBeforeThatDay };
  } else if (dimension === "14日") {
    订单查询条件['完成时间'] = { $gte: FourteenDaysBeforeThatDay };
  } else if (dimension === "30日") {
    订单查询条件['完成时间'] = { $gte: ThirtyDaysBeforeThatDay };
  } else {
    let errMsg = "携带的参数`收入维度`不为 7日，14日，30日 三种之一";
    res.json({ ok: false, errMsg: errMsg });
    return;
  }

  if (school !== "合计") {
    订单查询条件['配送地址.学校'] = school;
    if (dormitory !== "合计")
      订单查询条件['配送地址.宿舍楼'] = dormitory;
  }

  console.log("订单查询条件是", 订单查询条件);

  // constructor
  function AnalysisColumn(userType) {
    this.用户类型 = userType;
    this.学校 = school;
    this.宿舍楼 = dormitory || "合计";
    this.人数 = undefined;              // 一个微信号代表一个人
    this.人数占比 = undefined;          // 文档说下级除以上级
    this.时间基准 = date_base;
    this.收入维度 = dimension;
    this.总收入 = undefined;
    this.收入占比 = undefined;
    this.订单量 = undefined;
    this.客单价 = undefined;
    this.人均消费 = undefined;
    this.人均订单量 = undefined;
  }

  // 具体的统计函数 包一下
  function UserAnalysis(orders, callback) {

    let results = {
      '全部用户': new AnalysisColumn('全部用户'),
      '活跃用户': new AnalysisColumn('活跃用户'),
      '付费用户': new AnalysisColumn('付费用户'),
      '一般用户': new AnalysisColumn('一般用户'),
      '核心用户': new AnalysisColumn('核心用户'),
      '新增用户': new AnalysisColumn('新增用户'),
      '流失用户': new AnalysisColumn('流失用户'),
    };

    // 找出所有和这些订单有关的用户
    User.find({ openid: { $in: orders.map(o => o.买家openid) } }, (err, users) => {
      if (err) throw err;
      let openidToUserTypeTable = new Map;
      users.forEach(u => openidToUserTypeTable.set(u.openid, u.用户类型));

      let 全部用户的订单 = [];
      let 活跃用户的订单 = [];
      let 付费用户的订单 = [];
      let 一般用户的订单 = [];
      let 核心用户的订单 = [];
      let 新增用户的订单 = [];
      let 流失用户的订单 = [];

      for (let i = 0; i < orders.length; i++) {
        let order = orders[i];
        let userTypesInOrder = openidToUserTypeTable.get(order.买家openid);

        全部用户的订单.push(order);
        if (userTypesInOrder.includes("活跃用户")) 活跃用户的订单.push(order);
        if (userTypesInOrder.includes("付费用户")) 付费用户的订单.push(order);
        if (userTypesInOrder.includes("一般用户")) 一般用户的订单.push(order);
        if (userTypesInOrder.includes("核心用户")) 核心用户的订单.push(order);
        if (userTypesInOrder.includes("新增用户")) 新增用户的订单.push(order);
        if (userTypesInOrder.includes("流失用户")) 流失用户的订单.push(order);
      }

      results.全部用户.人数 = (new Set(全部用户的订单.map(o => o.买家openid))).size;
      results.活跃用户.人数 = (new Set(活跃用户的订单.map(o => o.买家openid))).size;
      results.付费用户.人数 = (new Set(付费用户的订单.map(o => o.买家openid))).size;
      results.一般用户.人数 = (new Set(一般用户的订单.map(o => o.买家openid))).size;
      results.核心用户.人数 = (new Set(核心用户的订单.map(o => o.买家openid))).size;
      results.新增用户.人数 = (new Set(新增用户的订单.map(o => o.买家openid))).size;
      results.流失用户.人数 = (new Set(流失用户的订单.map(o => o.买家openid))).size;

      let toPrecentString = (num) => (num * 100).toFixed(2) + "%";

      results.全部用户.人数占比 = toPrecentString(1);
      results.活跃用户.人数占比 = toPrecentString(results.全部用户.人数 === 0 ? 0 : results.活跃用户.人数 / results.全部用户.人数);
      results.付费用户.人数占比 = toPrecentString(results.付费用户.人数 === 0 ? 0 : results.付费用户.人数 / results.活跃用户.人数);
      results.一般用户.人数占比 = toPrecentString(results.一般用户.人数 === 0 ? 0 : results.一般用户.人数 / results.付费用户.人数);
      results.核心用户.人数占比 = toPrecentString(results.核心用户.人数 === 0 ? 0 : results.核心用户.人数 / results.一般用户.人数);
      results.新增用户.人数占比 = "没卵用的";
      results.流失用户.人数占比 = "没卵用的";

      results.全部用户.总收入 = Math.round(全部用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));
      results.活跃用户.总收入 = Math.round(活跃用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));
      results.付费用户.总收入 = Math.round(付费用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));
      results.一般用户.总收入 = Math.round(一般用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));
      results.核心用户.总收入 = Math.round(核心用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));
      results.新增用户.总收入 = Math.round(新增用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));
      results.流失用户.总收入 = Math.round(流失用户的订单.map(o => o.支付金额).reduce((a, b) => a + b, 0));

      results.全部用户.收入占比 = toPrecentString(1);
      results.活跃用户.收入占比 = toPrecentString(results.活跃用户.总收入 === 0 ? 0 : results.活跃用户.总收入 / results.全部用户.总收入);
      results.付费用户.收入占比 = toPrecentString(results.付费用户.总收入 === 0 ? 0 : results.付费用户.总收入 / results.活跃用户.总收入);
      results.一般用户.收入占比 = toPrecentString(results.一般用户.总收入 === 0 ? 0 : results.一般用户.总收入 / results.付费用户.总收入);
      results.核心用户.收入占比 = toPrecentString(results.核心用户.总收入 === 0 ? 0 : results.核心用户.总收入 / results.一般用户.总收入);
      results.新增用户.收入占比 = "没卵用的";
      results.流失用户.收入占比 = "没卵用的";

      results.全部用户.订单量 = 全部用户的订单.length;
      results.活跃用户.订单量 = 活跃用户的订单.length;
      results.付费用户.订单量 = 付费用户的订单.length;
      results.一般用户.订单量 = 一般用户的订单.length;
      results.核心用户.订单量 = 核心用户的订单.length;
      results.新增用户.订单量 = 新增用户的订单.length;
      results.流失用户.订单量 = 流失用户的订单.length;

      results.全部用户.客单价 = (results.全部用户.订单量 === 0 ? 0 : (results.全部用户.总收入 / results.全部用户.订单量)).toFixed(2);
      results.活跃用户.客单价 = (results.活跃用户.订单量 === 0 ? 0 : (results.活跃用户.总收入 / results.活跃用户.订单量)).toFixed(2);
      results.付费用户.客单价 = (results.付费用户.订单量 === 0 ? 0 : (results.付费用户.总收入 / results.付费用户.订单量)).toFixed(2);
      results.一般用户.客单价 = (results.一般用户.订单量 === 0 ? 0 : (results.一般用户.总收入 / results.一般用户.订单量)).toFixed(2);
      results.核心用户.客单价 = (results.核心用户.订单量 === 0 ? 0 : (results.核心用户.总收入 / results.核心用户.订单量)).toFixed(2);
      results.新增用户.客单价 = (results.新增用户.订单量 === 0 ? 0 : (results.新增用户.总收入 / results.新增用户.订单量)).toFixed(2);
      results.流失用户.客单价 = (results.流失用户.订单量 === 0 ? 0 : (results.流失用户.总收入 / results.流失用户.订单量)).toFixed(2);

      results.全部用户.人均消费 = (results.全部用户.人数 === 0 ? 0 : results.全部用户.总收入 / results.全部用户.人数).toFixed(2);
      results.活跃用户.人均消费 = (results.活跃用户.人数 === 0 ? 0 : results.活跃用户.总收入 / results.活跃用户.人数).toFixed(2);
      results.付费用户.人均消费 = (results.付费用户.人数 === 0 ? 0 : results.付费用户.总收入 / results.付费用户.人数).toFixed(2);
      results.一般用户.人均消费 = (results.一般用户.人数 === 0 ? 0 : results.一般用户.总收入 / results.一般用户.人数).toFixed(2);
      results.核心用户.人均消费 = (results.核心用户.人数 === 0 ? 0 : results.核心用户.总收入 / results.核心用户.人数).toFixed(2);
      results.新增用户.人均消费 = (results.新增用户.人数 === 0 ? 0 : results.新增用户.总收入 / results.新增用户.人数).toFixed(2);
      results.流失用户.人均消费 = (results.流失用户.人数 === 0 ? 0 : results.流失用户.总收入 / results.流失用户.人数).toFixed(2);

      results.全部用户.人均订单量 = (results.全部用户.人数 === 0 ? 0 : results.全部用户.订单量 / results.全部用户.人数).toFixed(2);
      results.活跃用户.人均订单量 = (results.活跃用户.人数 === 0 ? 0 : results.活跃用户.订单量 / results.活跃用户.人数).toFixed(2);
      results.付费用户.人均订单量 = (results.付费用户.人数 === 0 ? 0 : results.付费用户.订单量 / results.付费用户.人数).toFixed(2);
      results.一般用户.人均订单量 = (results.一般用户.人数 === 0 ? 0 : results.一般用户.订单量 / results.一般用户.人数).toFixed(2);
      results.核心用户.人均订单量 = (results.核心用户.人数 === 0 ? 0 : results.核心用户.订单量 / results.核心用户.人数).toFixed(2);
      results.新增用户.人均订单量 = (results.新增用户.人数 === 0 ? 0 : results.新增用户.订单量 / results.新增用户.人数).toFixed(2);
      results.流失用户.人均订单量 = (results.流失用户.人数 === 0 ? 0 : results.流失用户.订单量 / results.流失用户.人数).toFixed(2);

      (typeof callback === "function" && callback(null, results));
    });
  }

  function EveryoneAnalysis(orders, callback) {
    // 找出所有和这些订单有关的用户
    User.find({ openid: { $in: orders.map(o => o.买家openid) } }, (err, users) => {
      if (err) throw err;
      let results = [];

      School.find({ "学校名": { $in: users.map(u => u.地址.学校) } }, (err, schools) => {
        users.forEach(user => {
          let result = {};

          let ordersInTheseDay = orders.filter(o => (o.买家openid === user.openid));
          let totalAmount = ordersInTheseDay.reduce((acc, order) => (acc + order.支付金额), 0);

          result.学校 = user.地址.学校 || "未填写";
          result.宿舍 = user.地址.宿舍楼 || "未填写";
          result.宿舍号 = user.地址.宿舍号 || "未填写";
          result.名字 = user.地址.姓名 || "未填写";
          result.电话 = user.地址.电话 || "未填写";
          result.性别 = user.地址.学校 && user.地址.宿舍楼 ?
            utils.getBuildingGender(schools.find(s => s.学校名 === user.地址.学校), user.地址.宿舍楼) :
            "无相关信息";
          result.用户类型 = user.用户类型;
          result.时间基准 = date_base;
          result.收入维度 = dimension;
          result.消费总额 = totalAmount.toFixed(2);
          result.订单数 = ordersInTheseDay.length;
          result.客单价 = (ordersInTheseDay.length === 0 ? 0 : totalAmount / ordersInTheseDay.length).toFixed(2);
          result.历史订单数 = user.历史订单.length;
          result.初次登录日期 = utils.dateToyyyyMMddString(utils.convertObjectIdToDate(user._id));
          results.push(result);
        });
        (typeof callback === "function" && callback(null, results));
      });
    });
  }

  Order.find(订单查询条件, (err, orders) => {
    if (err) {
      console.log(err);
      res.send('数据库查询出错');
      return;
    }
    // 现在获得的orders就是某学校某些宿舍楼的所有相关订单
    console.log("查询获得订单数量为", orders.length);
    UserAnalysis(orders, (err, analysis_results) => {
      if (err) throw err;
      EveryoneAnalysis(orders, (err, everyone_results) => {
        res.json({ ok: true, results: { analysis_results: analysis_results, everyone_results: everyone_results } });
      });
    });
  });
});

// 由学校 查宿舍楼列表
router.get('/check/dorm_building', (req, res, next) => {
  if (!req.query['学校名']) {
    res.json({
      ok: false,
      code: 25,
      codeName: "请求queryString未携带参数'学校名'"
    });
    return;
  }
  var result = []; // { '宿舍楼': '订单量' }
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

    res.json({
      ok: true,
      result: school.宿舍楼
    });
  });
});



module.exports = router;
