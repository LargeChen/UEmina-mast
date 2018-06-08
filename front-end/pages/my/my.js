var md5 = require('../../utils/md5.js').md5;
var util = require('../../utils/util.js');
var app = getApp();

Page({
    onLoad: function () {
        var that = this
        app.getUserInfo(
            (info) => {
                that.setData({
                    userInfo: info
                });
            }
        );
    },
    onShow: function() {
        app.ensureConnect(() => console.log(app.getRequestHeader()));
    },
})