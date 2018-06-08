var app = getApp();

Page({
  data: {
    schools: [],
    sc: -1,

    dormitories: [],
    dor: -1,

    // 目前是在修改默认地址还是备用地址(spare)
    target: "default",
    // 是否选为默认地址
    set_default_check: false,
  },
  onLoad: function(args) {
    this.setData({
      target: args.target
    });
    var that = this;
    // 更新学校列表
    wx.request({
      url: app.serverApiUrl + 'schools',
      method: 'GET',
      success: function(res) {
        var data = res.data;
        console.log(data);
        if (!data.ok) {
          console.log('获取学校列表失败');
          return;
        }
        that.setData({
          schools: data.schools
        });
        console.log('成功更新学校列表', that.data.schools);
        // 先保证有openID，再同步
        app.ensureConnect(that.addressSync);
      }
    });
  },

  onShow: function() {
  },
  // 同步本页面data信息
  addressSync: function() {
    console.log('准备地址同步');
    var that = this;
    var addressInfo = {};
    // 获取用户的地址信息 可能为空
    wx.request({
      url: app.serverApiUrl + 'address',
      method: 'GET',
      data: {
        '备用': that.data.target === 'spare',
      },
      header: app.getRequestHeader(),
      success: function(res) {
        var data = res.data;
        if (!data.ok) {
          console.log('获取用户地址信息失败');
          return;
        }
        console.log(data);
        addressInfo = data.address;
        // 如果有学校信息就帮它选
        if (addressInfo['学校'])
          that.schoolChoose(addressInfo['学校'], () => {
            if (addressInfo['宿舍楼'])
              that.dormitoryChoose(addressInfo['宿舍楼']);
          });
        if (addressInfo['宿舍号'])
          that.setData({
            room: addressInfo['宿舍号']
          });
        if (addressInfo['姓名'])
          that.setData({
            name: addressInfo['姓名']
          });
        if (addressInfo['电话'])
          that.setData({
            phone: addressInfo['电话']
          });
      }
    });
  },

  // 下面开始绑定一些输入操作
  SchoolChange: function(e) {
    var that = this;
    var sc = e.detail.value;
    var school_name = that.data.schools[sc];
    that.schoolChoose(school_name);
  },

  schoolChoose: function(school_name, callback) {
    var that = this;
    var sc = that.data.schools.indexOf(school_name);
    if (!(sc >= 0)) {
      console.log('页面data的学校列表中不存在此学校', that.data.schools, school_name);
      return;
    }
    that.setData({
      sc: sc
    });
    // 选择了学校后 更新宿舍楼列表
    wx.request({
      url: app.serverApiUrl + 'dormitories',
      method: 'GET',
      data: {
        '学校名': school_name
      },
      success: function(res) {
        var data = res.data;
        if (!data.ok) {
          console.log('获取宿舍楼失败');
          return;
        }
        that.setData({
          dormitories: data.dormitories
        });
        typeof callback == 'function' && callback();
      }
    });
  },

  DormitoryChange: function(e) {
    this.setData({
      dor: e.detail.value
    });
  },

  dormitoryChoose: function(dormitory_name) {
    var that = this;
    var dor = that.data.dormitories.indexOf(dormitory_name);
    if (!(dor >= 0)) {
      console.log('页面data的宿舍楼列表中不存在此宿舍楼');
      return;
    }
    that.setData({
      dor: dor
    });
  },

  RoomChange: function(e) {
    this.setData({
      room: e.detail.value
    });
  },

  NameChange: function(e) {
    this.setData({
      name: e.detail.value
    });
  },

  PhoneChange: function(e) {
    this.setData({
      phone: e.detail.value
    });
  },

  addressSaveClick: function(e) {
    console.log('点击了保存按钮');
    var that = this;
    wx.request({
      url: app.serverApiUrl + 'address',
      method: 'POST',
      header: app.getRequestHeader(),
      data: {
        '学校': that.data.schools[that.data.sc],
        '宿舍楼': that.data.dormitories[that.data.dor],
        '宿舍号': that.data.room,
        '姓名': that.data.name,
        '电话': that.data.phone,
        '备用': that.data.target === 'spare',
        '设为默认': that.data.set_default_check,
      },
      // 不知道为什么就是不调用这个
      success: function(res) {
        console.log(res);
        var data = res.data;
        console.log(data);
        if (!data.ok) {
          console.log('请求保存地址信息失败');
          return;
        }
        console.log('请求保存地址信息成功');
      }
    })
    // wx.showToast({
    //   title: '修改成功',
    //   icon: 'success',
    //   duration: 1000
    // });
    wx.navigateBack();
  },
  // 修改是否设为默认
  check_set: function() {
    var that = this;
    this.setData({
      set_default_check: !that.data.set_default_check
    });
  },
})