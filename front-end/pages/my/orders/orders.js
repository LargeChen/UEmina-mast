var app = getApp();

Page({
  data: {
    serverUrl: app.serverUrl,
    orders: []
  },
  onShow: function() {
    app.ensureConnect(this.getOrders);
  },
  getOrders: function() {
    var that = this;
    wx.request({
      url: app.serverApiUrl + 'order',
      method: 'GET',
      header: app.getRequestHeader(),
      success: function(res) {
        var data = res.data;
        console.log(res);
        if(!data.ok) {
          console.log('获取订单失败');
          return false;
        }

        for(var order of data.orders) {
          var d = new Date(order['完成时间']);
          order['完成时间'] = d.toLocaleDateString() + ' ' + d.getHours() + ':' + d.getMinutes();
          order['支付金额'] = order['支付金额'].toFixed(2);
        }

        console.log("订单列表返回内容为: ", data.orders);

        that.setData({
          orders: data.orders
        })
      }
    });
  }
})