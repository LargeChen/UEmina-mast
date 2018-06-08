
var md5 = require('../../utils/md5.js').md5;
var util = require('../../utils/util.js');

var app = getApp()

Page({
  data: {
    serverUrl: app.serverUrl,
    // 支付按钮的状态，取值为'disabled','active'
    pay_btn_status: 'disabled',
    // 这里的cart是数组，和 index页的cart是对象 不一致
    cart: [],
    // 购物车里的价格，不包括运费
    cart_total: 0,
    // 起送价
    min_total: 0,
    // 运费
    transport_fare: 0,
    // * UPDATE: 真正需要用户支付的（先计算运费，再减免优惠金额）
    total_price: 0,
    // 地址相关信息
    addr_school: null,
    addr_dor: null,
    addr_room: null,
    addr_name: null,
    addr_phone: null,
    // 配送时间段
    deliver_times: ["00:00-23:59"],
    dt_index: -1,
    // 提示：为啥支付按钮无效？
    why_cant_pay: "",
    // 备注
    note_msg: "",
    // 优惠券相关
    coupon: null, // 已经选中的优惠券
    coupons_useful: false, // 是否有可用优惠券
    coupon_current_discount: 0, // 当前选中的优惠券，能够减免多少，优惠券类型是什么
    // 是否选择备用地址
    select_spare_address: false,
  },
  onLoad: function() {
    // 取消选择备用地址
    wx.setStorageSync('using_spare', false);
    this.setData({
      select_spare_address: false,
    });
  },
  onShow: function() {
    // 获取地址
    app.ensureConnect(this.addressSync);
    this.syncCart();
  },
  checkPayBtn: function() {
    // 设置支付按钮的状态
    if(!this.data.addr_school || !this.data.addr_dor || !this.data.addr_name || !this.data.addr_phone) {
      this.setData({
        why_cant_pay: '请补全地址信息',
        pay_btn_status: 'disabled'
      });
    } else if(this.data.dt_index == -1) {
      this.setData({
        why_cant_pay: '请选择配送时段',
        pay_btn_status: 'disabled'
      });
    } else {
      this.setData({
        pay_btn_status: 'active'
      });
    }
  },
  sumForEachProductInCart: function() {
    var that = this;
    var cart = that.data.cart;
    cart.forEach((item) => {
      item['单个商品总价'] = (item['单价'] * item['购买量']).toFixed(2);
    });
    that.setData({
      cart: cart,
    });
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
        that.sumForEachProductInCart();
        that.calcCartTotal();

        // 检查优惠券
        that.checkGlobalCoupon();
      }
    });
  },
  addOneClick: function(event) {
    var product_name = event.currentTarget.dataset.product_name;
    this.buyOne(product_name);
    // this.sumForEachProductInCart();
    // this.calcCartTotal();
  },
  subOneClick: function(event) {
    var product_name = event.currentTarget.dataset.product_name;
    this.returnOne(product_name);
    // this.sumForEachProductInCart();
    // this.calcCartTotal();
  },
  // 购入量加一
  buyOne: function(product_name) {
    var that = this;
    var this_product = that.data.cart.find((elem) => elem['商品名'] == product_name);
    if (this_product['购买量'] + 1 <= this_product['库存']) {
      var cart = wx.getStorageSync('cart');
      cart[product_name] += 1;
      this_product['购买量'] += 1;
      that.setData({
        cart: that.data.cart
      });
      wx.setStorageSync('cart', cart);
      that.syncCart();
    } else {
      wx.showToast({
        title: "库存不足啦",
        duration: 800
      });
    }
  },
  // 购入量减一
  returnOne: function(product_name) {
    var that = this;
    var this_product = that.data.cart.find((elem) => elem['商品名'] == product_name);
    var cart = wx.getStorageSync('cart');
    if (this_product['购买量'] - 1 > 0) {
      cart[product_name] -= 1;
      this_product['购买量'] -= 1;
      that.setData({
        cart: that.data.cart
      });
      wx.setStorageSync('cart', cart);
      that.syncCart();
    } else if (this_product['购买量'] - 1 === 0) {
      cart[product_name] = undefined;
      var index = that.data.cart.indexOf(this_product);
      if (index > -1) that.data.cart.splice(index, 1);
      that.setData({
        cart: that.data.cart
      });
      wx.setStorageSync('cart', cart);
      that.syncCart();
    } else {
      console.error("出现了小于0的情况！");
    }
  },
  // 计算购物车总价
  calcCartTotal: function() {
    var total= 0;
    for (var item of this.data.cart) {
      total += item['单价'] * item['购买量'];
    }
    total = parseFloat(total.toFixed(2)); // 解决精度问题
    var total_price = total >= this.data.min_total ? total : total + this.data.transport_fare;
    // UPDATE
    var coupon_current_discount = wx.getStorageSync('coupon_current_discount');
    total_price -= coupon_current_discount;
    this.setData({
      cart_total: total.toFixed(2),
      total_price: total_price.toFixed(2)
    });
  },
  // 同步本页面data信息
  addressSync: function() {
    console.log('准备地址同步');
    var that = this;
    var addressInfo = {};
    // 获取用户的地址信息 可能为空
    var spare = wx.getStorageSync('using_spare')? 'true': 'false';
    wx.request({
      url: app.serverApiUrl + 'address',
      method: 'GET',
      header: app.getRequestHeader(),
      data: {
        '备用': spare
      },
      success: function(res) {
        var data = res.data;
        if (!data.ok) {
          console.log('获取用户地址信息失败');
          return;
        }
        addressInfo = data.address;
        console.log("地址信息：", addressInfo);
        // 如果有学校信息就帮它选
        that.setData({
          addr_school: addressInfo['学校'] || "",
          addr_dor: addressInfo['宿舍楼'] || "",
          addr_room: addressInfo['宿舍号'] || "",
          addr_name: addressInfo['姓名'] || "",
          addr_phone: addressInfo['电话'] || "",

          // dt_index: -1,
        });
        // 获取这个学校对应的配送时段
        if(addressInfo['学校'] !== undefined) {
          that.getSchoolInfo();
        } else {
          // 取消选择备用地址
          wx.setStorageSync('using_spare', false);
          that.setData({
            select_spare_address: false,
          });
        }
        that.checkPayBtn();
      }
    });
  },
  // 配送时间改变
  DeliverChange: function(e) {
    console.log("配送时间改变", e);
    // 判断一下信息是否完整
    this.setData({
      dt_index: e.detail.value
    });
    this.checkPayBtn();
  },
  getSchoolInfo: function() {
    var that = this;
    wx.request({
      url: app.serverApiUrl + 'delivery_info',
      method: 'GET',
      data: {
        '学校名': that.data.addr_school
      },
      success: function(res) {
        var data = res.data.delivery_info;
        if (!res.data.ok) {
          console.log('获取学校对应配送时间失败');
          return;
        }
        console.log(res);
        var deliver_times = [];
        if (data['交易时段']) {
          for (var p of data['交易时段']) {
            deliver_times.push(p['配送时段']["开始时间"] + " - " + p['配送时段']["结束时间"] + '（' + p['下单时段']['结束时间'] + '截单）');
          }
        }
        that.setData({
          min_total: data['起送价'],
          transport_fare: data['运费'],
          deliver_times: deliver_times,
        });
        that.sumForEachProductInCart();
        that.calcCartTotal();
      }
    })
  },
  clickPay: function(e) {
    if (this.data.pay_btn_status == 'disabled') {
      var that = this;
      wx.showToast({
        title: that.data.why_cant_pay,
        image: "/images/info-alert.png"
      });
      console.log("支付按钮无效");
    } else {

      var cart_obj = {};
      for (var x of this.data.cart) {
        cart_obj[x["商品名"]] = x["购买量"];
      }

      var ts = this.data.deliver_times[this.data.dt_index].split("（")[0].split(" - ");

      var period = {
        "开始时间": ts[0],
        "结束时间": ts[1]
      };

      console.log({
        "商品条目": cart_obj,
        "配送时段": period,
        "备注": this.data.note_msg
      });

      var that = this;
      var address = wx.getStorageSync('using_spare')? 'spare': 'default';
      // 首先向服务器发起下单请求
      wx.request({
        url: app.serverApiUrl + 'buy',
        method: 'POST',
        header: app.getRequestHeader(),
        data: {
          "商品条目": cart_obj,
          "配送时段": period,
          "地址使用": address,
          "备注": that.data.note_msg,
          "优惠券_id": (that.data.coupon ? that.data.coupon._id : undefined) // 若不使用优惠券则此字段为空
        },
        success: function(res) {
          console.log('下单请求成功', res);
          var data = res.data;
          if (!data.ok) {
            console.log(data);
            console.log("创建订单失败: ", data.errMsg);
            wx.showToast({
              title: data.errMsg || "未知原因下单失败",
              duration: 2000,
              image: "/images/info-alert.png"
            });
            return false;
          }

          // 下单成功则清空购物车
          wx.setStorageSync('cart', {});
          that.syncCart();
          
          // 强耦合 不要问我为什么这么写代码 除非老板加工资
          var result = data.result; // Why data.result.xml? 
          if (!result || !result.return_code || !result.result_code) {
              console.log('但业务交易失败');
              wx.showToast({
                title: "唤起支付失败",
                image: "/images/info-alert.png"
              });
              return;
          }
          var appId = app.appId;
          var timeStamp = Math.floor(Date.now() / 1000).toString(); // 精确到秒
          var nonceStr = util.randomString();
          var package_ = 'prepay_id=' + result.prepay_id[0];
          var signType = 'MD5';
          // 根据 https://pay.weixin.qq.com/wiki/doc/api/wxa/wxa_api.php?chapter=4_3 方法签名
          var stringA = 'appId=' + appId + '&nonceStr=' + nonceStr +
                        '&package=' + package_ + '&signType=' + signType +
                        '&timeStamp=' + timeStamp;
          var stringSignTemp = stringA + '&key=' + app.paymentKey;
          console.log('stringA为', stringSignTemp);
          var sign = md5(stringSignTemp).toUpperCase();
          console.log('签名为', sign);
          
          wx.requestPayment({
              timeStamp: timeStamp,
              nonceStr: nonceStr,
              package: package_,
              signType: signType,
              paySign: sign,
              success: function(res){
                  console.log('支付成功！', res);
                  wx.showToast({
                    title: "购买成功！",
                    icon: 'success',
                    duration: 1000
                  });
              },
              complete: function(res) {
                  console.log('完成请求', res);
              },
              fail: function(res) {
                  console.log('支付失败', res);
                  wx.showToast({
                    title: "购买失败",
                    icon: 'fail',
                    duration: 1000
                  });
              }
          });
        }
      })
    }
  },
  noteChange: function(e) {
    this.setData({
      note_msg: e.detail.value
    });
  },
  // === 优惠券相关 ===
  checkGlobalCoupon: function() {
    var coupon = wx.getStorageSync('coupon');
    if(coupon == null) {
      wx.setStorageSync('coupon_current_discount', 0);
      this.setData({
        coupon: null,
        coupon_current_discount: 0,
      });
      this.calcCartTotal();
      app.ensureConnect(this.checkUsefulCoupons);
    } else {
      this.getCouponInfo(coupon._id);
    }
  },
  getCouponInfo: function(global_coupon_id) {
    var that = this;
    var cart_obj = {};
    for (var x of this.data.cart) {
      cart_obj[x["商品名"]] = x["购买量"];
    }
    wx.request({
      url: app.serverApiUrl + 'coupons_info',
      method: 'POST',
      contentType: 'application/json',
      header: app.getRequestHeader(),
      data: {
        '商品条目': cart_obj,
        '优惠券_id': global_coupon_id
      },
      success: function(res) {
        var data = res.data;
        console.log(data);
        if (!data.ok) {
          console.log('从数据库获取优惠券info失败');
          that.setData({
            coupon: null,
            coupon_current_discount: 0,
          });
          wx.setStorageSync('coupon_current_discount', 0);
          wx.setStorageSync('coupon', null);
          that.calcCartTotal();
          that.checkGlobalCoupon();
          return false;
        }
        var coupon = wx.getStorageSync('coupon');
        if(coupon['优惠内容']['券类型名称'] == '满减券') {
          coupon.text = "满" + coupon['优惠内容']['价格要求'] + "减" + coupon['优惠内容']['价格优惠'];
        } else if(coupon['优惠内容']['券类型名称'] == '商品券') {
          coupon.text = coupon['优惠内容']['商品名'] + (coupon['优惠内容']['优惠折扣'] * 10).toFixed(1) + "折";
        } else if(coupon['优惠内容']['券类型名称'] == '类目券') {
          coupon.text = coupon['优惠内容']['类目名'] + (coupon['优惠内容']['优惠折扣'] * 10).toFixed(1) + "折";
        } else {
          coupon.text = "优惠券";
        }
        that.setData({
          coupon_current_discount: data.减免金额.toFixed(2),
          coupon: coupon
        });
        wx.setStorageSync('coupon_current_discount', data.减免金额.toFixed(2));

        that.calcCartTotal();
      }
    });
  },
  checkUsefulCoupons: function() {
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
        '曝光': false,
      },
      success: function(res) {
        var data = res.data;
        // console.log(data);
        if (!data.ok) {
          console.log('从数据库获取可用优惠券失败');
          return false;
        }
        that.setData({
          coupons_useful: data.coupons['可用'].length > 0
        });
      }
    });
  },
  // 切换选用的地址
  toggle_addr: function() {
    console.log("熊本熊之滑！");
    var that = this;
    this.setData({
      select_spare_address: !this.data.select_spare_address,
      dt_index: -1,
    });
    var spare = wx.getStorageSync('using_spare');
    wx.setStorageSync('using_spare', !spare);
    app.ensureConnect(this.addressSync);
  },
  // 修改地址
  modify_addr: function() {
    var target = wx.getStorageSync('using_spare')? 'spare': 'default';
    wx.navigateTo({
      url: '/pages/my/address/modify/modify?target=' + target
    });
  }
});