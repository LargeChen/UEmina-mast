//index.js
//获取应用实例
var app = getApp()

Page({
  data: {
    serverUrl: app.serverUrl,
    imgUrls: [],
    name: "加载中...",
    description: "",
    price: "0.00",
    inventory: 0, // 库存
    attrs: [],
    detail_imgs: [],
    // 购物车
    cart: [],
    cart_count: 0,
    // 当前商品对象
    product: null,
    // 详情图的高度值
    imageHeight: {},
  },
  onLoad: function(args) {
    var that = this;
    var product_names = args.name;
    wx.request({
      url: app.serverApiUrl + 'product',
      method: 'GET',
      data: {
        '商品名': product_names
      },
      success: function(res) {
        var data = res.data;
        if (!data.ok) console.log('从数据库获取' + product_names.toString() + '失败');
        var product = res.data.product;

        that.setData({
          imgUrls: product['缩略图'],
          name: product['商品名'],
          description: product['导购语'],
          price: product['单价'],
          inventory: product['库存'],
          attrs: product['规格'],
          detail_imgs: product['详情图'],
          product: product,
        });
      }
    });
  },

  syncCart: function() {
    var that = this;
    var cart = wx.getStorageSync('cart') || {};
    var product_names = Object.keys(cart);
    wx.request({
      url: app.serverApiUrl + 'product',
      method: 'GET',
      data: {
        '商品名': product_names
      },
      success: function(res) {
        var data = res.data;
        if (!data.ok) console.log('从数据库获取' + product_names.toString() + '失败');
        var products = res.data.products;
        products.forEach((product) => {
          product['购买量'] = cart[product['商品名']];
        });
        that.setData({
          cart: products,
        });
        that.calcCartCount();
      }
    });
  },

  onShow: function() {
    this.syncCart();
  },

  // 购入量加一，不用提供商品名，使用this.data.product_name
  buyOne: function() {
    var that = this;
    var product_name = that.data.name;
    var this_product = that.data.cart.find((elem) => elem['商品名'] == product_name);
    if (!this_product && that.data.inventory) {
      // 如果没有添加过这个商品 
      that.data.cart.push(that.data.product);
      this_product = that.data.cart.find((elem) => elem['商品名'] == product_name);
      this_product['购买量'] = 1;
      var cart = wx.getStorageSync('cart');
      cart[this_product['商品名']] = 1;
      this_product['购买量'] = 1;
      that.setData({
        cart: that.data.cart
      });
      wx.setStorageSync('cart', cart);

    } else if (this_product['购买量'] + 1 <= this_product['库存']) {
      var cart = wx.getStorageSync('cart');
      cart[this_product['商品名']] += 1;
      this_product['购买量'] += 1;
      that.setData({
        cart: that.data.cart
      });
      wx.setStorageSync('cart', cart);

    } else {
      wx.showToast({
        title: "库存不足啦",
        duration: 800
      });
    }
  },

  add_to_cart: function(e) {
    this.buyOne();
    this.calcCartCount();
  },

  // 计算购物车里有多少东西
  calcCartCount: function() {
    var count = this.data.cart.reduce(function(a,b) {
      return a + b['购买量'];
    }, 0);

    this.setData({
      cart_count: count
    });
  },

  toCart: function() {
    wx.switchTab({
      url: '/pages/cart/cart'
    })
  },
  //图片加载事件:宽度为(750-60)rpx，计算原比例对应的高度
  imageLoad: function(e){
    var id = e.currentTarget.dataset.id,
      img_h = e.detail.height * (750-60) / e.detail.width;

    var imageHeight = this.data.imageHeight;
    imageHeight[id] = img_h;
    this.setData({
      imageHeight: imageHeight
    });
  },

});