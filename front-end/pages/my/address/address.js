var app = getApp();

Page({
  data: {
    address: {
      姓名: "加载中",
      电话: "加载中",
      学校: "加载中",
      宿舍楼: "加载中",
      宿舍号: "加载中",
    },
    address_spare: {
      姓名: "加载中",
      电话: "加载中",
      学校: "加载中",
      宿舍楼: "加载中",
      宿舍号: "加载中",
    },
  },
  onLoad: function() {
    app.ensureConnect(this.addressSync);
  },

  onShow: function() {
    app.ensureConnect(this.addressSync);
  },
  // 把空的地址项补上未填写
  fill_address: function(address) {
    if(!address.姓名) address.姓名 = "未填写";
    if(!address.电话) address.电话 = "未填写";
    if(!address.学校) address.学校 = "未填写";
    if(!address.宿舍楼) address.宿舍楼 = "未填写";
    if(!address.宿舍号) address.宿舍号 = "未填写";
    return address;
  },
  // 同步本页面data信息
  addressSync: function() {
    console.log('准备地址同步');
    var that = this;
    var addressInfo = {};
    // 获取用户的地址信息 可能为空
    wx.request({
      url: app.serverApiUrl + 'address_all',
      method: 'GET',
      header: app.getRequestHeader(),
      success: function(res) {
        var data = res.data;
        if (!data.ok) {
          console.log('获取用户地址信息失败');
          return;
        }
        console.log(data);
        that.setData({
          address: that.fill_address(data.address),
          address_spare: that.fill_address(data.address_spare),
        });
      }
    });
  },
  // 点击修改默认地址
  modify_address_default: function() {
    wx.navigateTo({
      url: '/pages/my/address/modify/modify?target=default'
    });
  },
  // 点击修改备用地址
  modify_address_spare: function() {
    wx.navigateTo({
      url: '/pages/my/address/modify/modify?target=spare'
    });
  },
});