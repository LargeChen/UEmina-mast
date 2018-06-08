
// var md5 = require('../../../utils/md5.js').md5;
// var util = require('../../../utils/util.js');

var app = getApp()

Page({
  data: {
    coupons_useful: [],
    current_coupon_id: null,
  },

  onShow: function() {
    var coupon = wx.getStorageSync('coupon');
    var current_coupon_id = coupon? coupon._id: null;
    this.setData({
      current_coupon_id: current_coupon_id
    });
    this.syncCart();
  },
  syncCart: function() {
    var that = this;
    var cart = wx.getStorageSync('cart') || {};
    var product_names = Object.keys(cart);
    // console.log(product_names);
    wx.request({
      url: app.serverApiUrl + 'product',
      method: 'GET',
      data: {
        '商品名': product_names
      },
      success: function(res) {
        var data = res.data;
        // console.log(data);
        if (!data.ok) console.log('从数据库获取' + product_names.toString() + '失败');
        var products = res.data.products;
        products.forEach((product) => {
          product['购买量'] = Math.min(cart[product['商品名']] || 0, product['库存']);
          // 顺便同步一下购物车为0的商品为undefined
          cart[product['商品名']] = product['购买量'] || undefined;
        });
        // 保存全局购物车
        wx.setStorageSync('cart', cart);
        // 筛掉不买的
        products = products.filter((product) => product['购买量'] !== 0);
        
        // console.log(products);
        that.setData({
          cart: products,
        });

        app.ensureConnect(that.getUsefulCoupons);
      }
    });
  },

  getUsefulCoupons: function() {
    var that = this;
    var cart_obj = {};
    for (var x of this.data.cart) {
      cart_obj[x["商品名"]] = x["购买量"];
    }
    
    wx.request({
      url: app.serverApiUrl + 'coupons_useful',
      method: 'POST',
      contentType: 'application/json',
      header: app.getRequestHeader(),
      data: {
        '商品条目': cart_obj,
        '曝光': true,
      },
      success: function(res) {
        var data = res.data;
        // console.log(data);
        if (!data.ok) console.log('从数据库获取可用优惠券失败');
        ['可用'].forEach(type => data.coupons[type].forEach(function(c) {
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
          coupons_useful: data.coupons['可用']
        });
      }
    });
  },
  // 更新全局优惠券
  updateGlobalCoupon: function(coupon) {
    wx.setStorageSync('coupon', coupon);
    wx.navigateBack();
  },
  // 点击了选择优惠券
  selectCoupon: function(event) {
    var cp_index = event.currentTarget.dataset.cpindex;
    this.updateGlobalCoupon(this.data.coupons_useful[cp_index]);
  },
  // 选择不使用优惠券
  clearCoupon: function(event) {
    this.updateGlobalCoupon(null);
  }
});