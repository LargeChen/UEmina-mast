var app = getApp()

Page({
  data: {
    phone: '155-2121-6538',
    wechat: 'uefriut_',
  },
  onShow: function() {
    app.ensureConnect(this.get_service);
  },
  get_service: function() {
    var that = this;
    wx.request({
      url: app.serverApiUrl + 'service',
      method: 'GET',
      header: app.getRequestHeader(),
      success: function(res) {
        var data = res.data;
        if (!data.ok) {
          console.log('获取用户地址对应的客服电话微信失败');
          return;
        }
        console.log(data);
        if(data.service) {
          that.setData({
            phone: data.service.电话,
            wechat: data.service.微信,
          });
        }
      }
    });
  },
  call_service: function() {
    var that = this;
    wx.makePhoneCall({
        phoneNumber: this.data.phone.replace(/-/g, '')
    });
  }
});