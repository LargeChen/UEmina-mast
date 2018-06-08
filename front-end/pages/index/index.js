//index.js
//获取应用实例
var app = getApp()
var utils = require('../../utils/util.js')

var touchDot = 0; //触摸时的原点
var time = 0; // 时间记录，用于滑动时且时间小于1s则执行左右滑动
var interval = ""; // 记录/清理 时间记录
var changeMenuFlag = true; // 判断左右滑动超出菜单最大值时不再执行滑动事件
var touchMovement = "nothing"; // 记录是向左还是向右滑，可能为"left"/"right"/"nothing"
const touchFakeWidth = 300; // 让商品列表居中，和CSS中.fake-touch-item的宽度相等
const loadingTime = 10; // 假装延迟一下

Page({
    data: {
        serverUrl: app.serverUrl,
        business_hours: "00:00-23:59",
        openning: false,
        menu: ["每日特惠"],
        now_menu: "每日特惠",
        now_product_list: [],
        cart: {},

        // debug: '/pages/my/promotions/promotions',
        // debug_tab: '/pages/cart/cart',
        hasUsefulCoupon: false,
        cover_bg_loaded: true,
        cover_fg_loaded: true,
        coupons_useful: [],

        // 商品滚动栏
        scrollTop: 0,

        // 用于左右滑动切换
        scrollLeft: 0,
        touchDot: 0,
        menu_index: "menu-0",
        loadingProducts: false,

        banners: [],
    },
    onLoad: function () {
        // 当前正在开发的页面
        if (this.data.debug) {
            wx.navigateTo({
                url: this.data.debug
            });
        }
        if (this.data.debug_tab) {
            wx.switchTab({
                url: this.data.debug_tab
            });
        }
        // app.ensureConnect(this.checkUsefulCoupons);
        app.ensureConnect(this.getCoupons);
        app.getUserInfo();
    },
    // 启动时检查是否有可用优惠券
    // checkUsefulCoupons: function () {
    //     var that = this;
    //     wx.request({
    //         url: app.serverApiUrl + 'coupon',
    //         method: 'GET',
    //         header: app.getRequestHeader(),
    //         success: function (res) {
    //             var data = res.data;
    //             if (!data.ok) {
    //                 console.log('从数据库获取coupons失败');
    //                 return false;
    //             }
    //             if (data.available_coupons && data.available_coupons.length > 0) {
    //                 that.setData({
    //                     hasUsefulCoupon: true,
    //                 });
    //             }
    //         }
    //     });
    // },
    // 获取优惠券
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
            if (!data.ok) {
                console.log('获取优惠券失败');
                return false;
            }
            
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
              coupons_useful: data.coupons['可用'],
              hasUsefulCoupon: data.coupons['可用'].length > 0
            });
          }
        });
      },
    // 点击查看优惠券
    checkCoupons: function () {
        this.closeCouponsCover();
        wx.navigateTo({
            url: '/pages/my/coupons/coupons'
        });
    },
    closeCouponsCover: function () {
        this.setData({
            hasUsefulCoupon: false,
        });
    },
    // 图片加载事件
    coverBgBind: function(e) {
        console.log("背景图加载");
        this.setData({
            cover_bg_loaded: true,
        });
    },
    coverFgBind: function(e) {
        this.setData({
            cover_fg_loaded: true,
        });
    },
    onShow: function () {
        var that = this;
        that.setData({
            // 从缓存中同步获取购物车内容
            cart: wx.getStorageSync('cart') || {},
        });
        wx.getSystemInfo({
            success: res => {
                that.setData({
                    // 商品滚动栏的高度 = 窗口高度（转换成rpx）- 营业时间高度 - 类目栏高度
                    // 变回以px为单位，否则在安卓机上会出问题
                    clientHeight: ((res.windowHeight * (750 / res.screenWidth)) - 33 - 90) * (res.screenWidth / 750),
                    screenWidth: res.screenWidth
                });
                console.log(res);
            }
        });
        // 获取分类信息
        wx.request({
            url: app.serverApiUrl + 'categories',
            method: 'GET',
            // 这个不成功那我也没办法了
            success: function (res) {
                var data = res.data;
                if (!data.ok) console.log('从数据库获取categories失败');
                var categories = data.categories || [];
                that.setData({
                    // middle栏（左右滑动的那栏）的项是 “每日特惠” + 所有分类
                    menu: ["每日特惠"].concat(categories),
                });
                that.menuChoose(that.data.now_menu);
            }
        });
        // 获取营业时间
        wx.request({
            url: app.serverApiUrl + 'openning_time',
            method: 'GET',
            // 这个不成功我也没办法了
            success: function (res) {
                var data = res.data;
                if (!data.ok) console.log('从数据库获取营业时间失败');
                var begin_time = data['营业时间']['开始时间'],
                    end_time = data['营业时间']['结束时间'];
                // 判断是否开业了
                that.openningCheck(begin_time, end_time);
                that.setData({
                    business_hours: begin_time + '-' + end_time
                });
            }
        });
        // 获取banners
        wx.request({
            url: app.serverApiUrl + 'banners',
            method: 'GET',
            // 这个不成功那我也没办法了
            success: function (res) {
                var data = res.data;
                if (!data.ok) console.log('从数据库获取banner失败');
                var banners = data.banners || [];
                that.setData({
                    banners: banners,
                });
            }
        });
    },
    menuSwitchClick: function (event) {
        this.menuChoose(event.currentTarget.dataset.name);
    },
    menuChoose: function (menu) {
        var that = this;
        this.setData({
            loadingProducts: true,
        });
        setTimeout(() => that.loadMenuProducts(menu), loadingTime);
    },
    loadMenuProducts: function(menu) {
        var that = this;
        var nth = this.data.menu.findIndex(element => menu === element);
        wx.request({
            url: app.serverApiUrl + 'products',
            method: 'GET',
            data: menu === '每日特惠' ? {
                '每日特惠': true
            } : {
                    '类目': menu
                },
            success: function (res) {
                var data = res.data;
                if (!data.ok) {
                    console.log('从数据库获取类目' + menu + '列表出错');
                    return;
                }
                var product_list = data.products;
                // 将售罄的排在后面
                var sell_out_list = product_list.filter(elem => elem['库存'] === 0);
                var on_sell_list = product_list.filter(elem => elem['库存'] > 0);
                product_list = on_sell_list.concat(sell_out_list);

                that.setData({
                    now_menu: menu,
                    now_product_list: product_list,
                    scrollTop: 0,
                    menu_index: "menu-" + nth,

                    loadingProducts: false,
                });
            }
        });
    },
    // 点击购物车图标购买时触发
    addToCartClick: function (event) {
        var product_name = event.currentTarget.dataset.product_name;
        this.buyOne(product_name);
    },
    addOneClick: function (event) {
        var product_name = event.currentTarget.dataset.product_name;
        this.buyOne(product_name);
    },
    subOneClick: function (event) {
        var product_name = event.currentTarget.dataset.product_name;
        this.returnOne(product_name);
    },
    // 购入量加一
    buyOne: function (product_name) {
        var that = this;
        var quantity = this.data.cart[product_name] || 0;
        var this_product = this.data.now_product_list.find((elem) => elem['商品名'] == product_name);
        if (quantity + 1 <= this_product['库存']) {
            this.setData({
                cart: Object.assign(that.data.cart, {
                    [product_name]: quantity + 1
                })
            });
            wx.setStorageSync('cart', this.data.cart);
        } else {
            wx.showToast({
                title: "库存不足啦",
                duration: 800
            });
        }
    },
    // 购入量减一
    returnOne: function (product_name) {
        var that = this;
        var quantity = this.data.cart[product_name] || 0;
        var this_product = this.data.now_product_list.find((elem) => elem['商品名'] == product_name);
        if (quantity - 1 >= 0) {
            this.setData({
                cart: Object.assign(that.data.cart, {
                    [product_name]: Math.min((quantity - 1), this_product['库存']) || undefined
                })
            });
            wx.setStorageSync('cart', this.data.cart);
        }
    },
    // 点击商品名 进入商品详情页
    openDetailPage: function (event) {
        console.log(event);
        var name = event.currentTarget.dataset.name;

        wx.navigateTo({
            url: "/pages/index/detail/detail?name=" + name
        });
    },
    // 比较时间是否在营业，修改openning变量
    openningCheck: function (begin_time, end_time) {
        this.setData({
            openning: utils.checkInTime(begin_time, end_time)
        });
    },

    onShareAppMessage: function () {
        return {
            title: 'UE鲜果+',
            path: '/pages/index/index'
        }
    },

    // 左右滑动切换（尝试中）

    // 触摸开始事件
    touchStart: function (e) {
        touchDot = e.touches[0].pageX; // 获取触摸时的原点
        // 使用js计时器记录时间  
        interval = setInterval(function () {
            time++;
        }, 100);
    },
    // 触摸移动事件
    touchMove: function (e) {
        var touchMove = e.touches[0].pageX;
        // 向左滑动 
        if (touchMove - touchDot <= -40 && time < 10) {
            var nth = this.data.menu.findIndex(element => this.data.now_menu === element);
            var nthMax = this.data.menu.length;
            if (nth + 1 < nthMax) { //每次移动中且滑动时不超过最大值 只执行一次
                touchMovement = "left";
            } else {
                touchMovement = "nothing";
            }
            return;
        }
        // 向右滑动
        if (touchMove - touchDot >= 40 && time < 10) {
            var nth = this.data.menu.findIndex(element => this.data.now_menu === element);
            if (nth > 0) {
                touchMovement = "right";
            } else {
                touchMovement = "nothing";
            }
            return;
        }
        touchMovement = "nothing";
        return;
    },
    // 触摸结束事件
    touchEnd: function (e) {
        if(touchMovement === "left") {
            var nth = this.data.menu.findIndex(element => this.data.now_menu === element);
            var next_menu = this.data.menu[nth+1];
            this.menuChoose(next_menu);
        } else if(touchMovement === "right") {
            var nth = this.data.menu.findIndex(element => this.data.now_menu === element);
            var prev_menu = this.data.menu[nth-1];
            this.menuChoose(prev_menu);
        }
        clearInterval(interval); // 清除setInterval
        time = 0;
        touchMovement = "nothing"; // 清除滑动事件
    },
})