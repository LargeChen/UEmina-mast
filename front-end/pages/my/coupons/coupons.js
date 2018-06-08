
// var md5 = require('../../../utils/md5.js').md5;
// var util = require('../../../utils/util.js');

var app = getApp()

Page({
  data: {
    coupons_useful: [],
    coupons_nottoday: [],
    coupons_unavailable: [],
  },

  onShow: function() {
    app.ensureConnect(this.getCoupons);
  },

  getCoupons: function() {
    var that = this;
    wx.request({
      url: app.serverApiUrl + 'coupons_all',
      method: 'GET',
      header: app.getRequestHeader(),
      // data: {},
      success: function(res) {
        var data = res.data;
        console.log(data);
        if (!data.ok) console.log('获取优惠券失败');
        
        ['可用', '未生效', '无效'].forEach(type => data.coupons[type].forEach(function(c) {
          if(c['优惠内容']['券类型名称'] === '满减券') {
            c['优惠内容']['优惠整数'] = Math.floor(c['优惠内容']['价格优惠']);
            c['优惠内容']['优惠小数'] = Math.floor(c['优惠内容']['价格优惠'] * 100 % 100);
            if(c['优惠内容']['优惠小数'] < 10) {
              c['优惠内容']['优惠小数'] = '0' + c['优惠内容']['优惠小数'];
            }
            c['优惠内容']['价格要求'] = c['优惠内容']['价格要求'].toFixed(2);
          }
          else if(c['优惠内容']['券类型名称'] === '商品券') {
            c['优惠内容']['优惠整数'] = Math.floor(c['优惠内容']['优惠折扣'] * 10);
            c['优惠内容']['优惠小数'] = Math.floor(c['优惠内容']['优惠折扣'] * 100 % 10);
          }
          else if(c['优惠内容']['券类型名称'] === '类目券') {
            c['优惠内容']['优惠整数'] = Math.floor(c['优惠内容']['优惠折扣'] * 10);
            c['优惠内容']['优惠小数'] = Math.floor(c['优惠内容']['优惠折扣'] * 100 % 10);
          }
          c['有效期']['生效日期'] = new Date(c['有效期']['生效日期']).toLocaleDateString('zh-CN');
          
          var temp_d = new Date(c['有效期']['失效日期']);
          temp_d.setDate(temp_d.getDate() - 1);
          c['有效期']['失效日期'] = temp_d.toLocaleDateString('zh-CN');
        }));
        that.setData({
          coupons_useful: data.coupons['可用'],
          coupons_nottoday: data.coupons['未生效'],
          coupons_unavailable: data.coupons['无效']
        });
      }
    });
  },
});
