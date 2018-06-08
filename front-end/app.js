//app.js
App({
    onLaunch: function () {
      //调用API从本地缓存中获取数据
      // 暂时没有卵用
      var logs = wx.getStorageSync('logs') || []
      logs.unshift(Date.now())
      wx.setStorageSync('logs', logs)
    },
    getUserInfo:function(cb){
      var that = this
      if(this.globalData.userInfo){
        typeof cb === "function" && cb(this.globalData.userInfo)
      }else{
        //调用登录接口
        wx.login({
          success: function (res) {
            console.log(res);
            var code = res.code;
            that.globalData.userCode = code;
            wx.getUserInfo({
              success: function (res) {
                that.globalData.userInfo = res.userInfo;
                typeof cb == "function" && cb(that.globalData.userInfo);
              }
            });
          }
        });
      }
    },
    getUserCode: function(cb){
      var that = this;
      if (that.globalData.userCode) {
        typeof cb === "function" && cb(that.globalData.userCode)
      } else {
        //调用登录接口
        wx.login({
          success: function (res) {
            console.log(res);
            that.globalData.userCode = res.code;
            typeof cb == "function" && cb(that.globalData.userCode);
          }
        });
      }
    },
    globalData: {
      userInfo: null,
      userCode: undefined,
      openid: undefined,
      session_id: undefined,
    },
    serverUrl: 'https://15842571.qcloud.la',
    serverApiUrl: 'https://15842571.qcloud.la/api/',
    // serverUrl: 'http://localhost:9090',
    // serverApiUrl: 'http://localhost:9090/api/',
    appId: 'wxaf49ef2917767d6c',
    paymentKey: '884a27322bd0bf1287e58a30b54ea26b',
    getRequestHeader: function() {
      var that = this;
      var app = that;
      return {
        'openid': app.globalData.openid,
        'session_id': app.globalData.session_id,
      }
    },
    // 确保openid和session_id存在
    ensureConnect: function(callback) {
      var that = this;
      var app = that;
      if (app.globalData.openid && app.globalData.session_id) {
        console.log('已确保openid和session_id存在');
        typeof callback === "function" && callback();
        return;
      }
      app.getUserCode((code) => {
        wx.request({
          url: app.serverApiUrl + 'get_session_id',
          method: 'GET',
          header: {
            code: code
          },
          success: function(res) {
            var data = res.data;
            if (!data.ok || !data.session_id || !data.openid) {
              console.log('获取openid和session_id失败');
              return;
            }
            app.globalData.openid = data.openid;
            app.globalData.session_id = data.session_id;
            console.log('成功获取openid和session_id');
            typeof callback === "function" && callback();
          }
        });
      });
    },
})
