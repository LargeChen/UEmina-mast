$(document).ready(function() {
  $(".dropdown.ui").dropdown();

  // 获取时段
  function getTimes() {
    var params = {
          "学校名": $(".dropdown.school").dropdown("get value")
        };
    // 请求时段数据
    $.ajax({
      url: '/order/check/delivery_period',
      type: 'GET',
      dataType: 'json',
      // contentType: 'application/json',
      data: params,
      success: (data) => {
        console.log(data);
        // 假装有异常处理
        var selector = ".column.period", // 下拉框的父元素
            classNames = "ui dropdown fluid period",
            periods = { "": "配送时段" }, // 默认数据
            params = {
              onChange: (value, text, choice) => {
                $("button.check, button.print, button.wx-order-notice, button.message-text, button.message-text-yunpian").addClass("disabled");
                getDormitory();
              },
            };
        for(var period of data.result) {
          var p_beg = period['开始时间'],
              p_end = period['结束时间'];
          periods[p_beg + ' - ' + p_end] = p_beg + ' - ' + p_end;
        }
        $(".ui.dropdown.period").remove();
        window.setupDropdown(selector, classNames, periods, params);
      },
    }).fail(window.ajaxCrash);
    // body...
  }

  function getDormitory() {
    var params = {
          "学校名": $(".dropdown.school").dropdown("get value"),
          // "配送时段": [{"开始时间": p_beg, "结束时间": p_end}],
          "开始时间": $(".dropdown.period").dropdown("get value").split(' - ')[0],
          "结束时间": $(".dropdown.period").dropdown("get value").split(' - ')[1],
        };
    // 请求宿舍楼数据
    $.ajax({
      url: '/order/check/dorm_building',
      type: 'get',
      // dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(params),
      data: params,
      success: (data) => {
        console.log(data);
        var selector = ".column.dormitory", // 下拉框的父元素
            classNames = "ui dropdown fluid dormitory",
            dormitories = { "": "宿舍楼" }, // 默认数据
            params = {
              onChange: (value, text, choice) => {
                $("button.check, button.print, button.wx-order-notice, button.message-text, button.message-text-yunpian").removeClass("disabled");
              },
            };

        for(var d of data.result) {
          dormitories[d.宿舍楼] = d.宿舍楼 + '(' + d.订单量 + ')';
        }
        $(".ui.dropdown.dormitory").remove();
        window.setupDropdown(selector, classNames, dormitories, params);
      },
    }).fail(window.ajaxCrash);
  }

  // 向服务器发送短信提醒的请求，默认今日（没有可选谢谢
  function SendTextMsg() {
    var params = {
      "学校": $(".dropdown.school").dropdown("get value"),
      "开始时间": $(".dropdown.period").dropdown("get value").split(' - ')[0],
      "结束时间": $(".dropdown.period").dropdown("get value").split(' - ')[1],
      "宿舍楼": $(".dropdown.dormitory").dropdown("get value"),
      "短信服务": "diyi",
    };

    $.ajax({
      url: '/order/send_message',
      type: 'post',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(params),
      success: (data) => {
        if(data.ok) {
          swal("发送成功", "", "success");
        } else {
          swal("发送失败", data.errMsg, "error");
        }
      },
    }).fail(window.ajaxCrash);
  }

  // 向服务器发送短信提醒的请求，默认今日（没有可选谢谢
  function SendTextMsgYunPian() {
    var params = {
      "学校": $(".dropdown.school").dropdown("get value"),
      "开始时间": $(".dropdown.period").dropdown("get value").split(' - ')[0],
      "结束时间": $(".dropdown.period").dropdown("get value").split(' - ')[1],
      "宿舍楼": $(".dropdown.dormitory").dropdown("get value"),
      "短信服务": "yunpian",
    };

    $.ajax({
      url: '/order/send_message',
      type: 'post',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(params),
      success: (data) => {
        if(data.ok) {
          swal("发送成功", "", "success");
        } else {
          swal("发送失败", data.errMsg, "error");
        }
      },
    }).fail(window.ajaxCrash);
  }


  // 向服务器发送短信提醒的请求，默认今日（没有可选谢谢
  function sendWxOrderNotice() {
    var params = {
      "学校": $(".dropdown.school").dropdown("get value"),
      "开始时间": $(".dropdown.period").dropdown("get value").split(' - ')[0],
      "结束时间": $(".dropdown.period").dropdown("get value").split(' - ')[1],
      "宿舍楼": $(".dropdown.dormitory").dropdown("get value")
    };

    $.ajax({
      url: '/order/send_order_notice',
      type: 'post',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(params),
      success: (data) => {
        if (data.ok) {
          swal("发送成功", "", "success");
        } else {
          swal("发送失败", data.errMsg, "error");
        }
      },
    }).fail(window.ajaxCrash);
  }


  function PrintOrders() {
    var params = {
      "学校": $(".dropdown.school").dropdown("get value"),
      "开始时间": $(".dropdown.period").dropdown("get value").split(' - ')[0],
      "结束时间": $(".dropdown.period").dropdown("get value").split(' - ')[1],
      "宿舍楼": $(".dropdown.dormitory").dropdown("get value")
    };

    $.ajax({
      url: '/order/print_orders',
      type: 'post',
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(params),
      success: (data) => {
        if(data.ok) {
          swal("打印成功", "", "success");
        } else {
          swal("打印失败", data.errMsg, "error");
        }
      },
    }).fail(window.ajaxCrash);
  }

  $(".dropdown.school").dropdown({
    onChange: (value, text, choice) => {
      // 刚选完学校，让按钮失效，查询配送时段
      $("button.check, button.print, button.wx-order-notice, button.message-text, button.message-text-yunpian").addClass("disabled");
      getTimes(value);
    },
  });

  $("button.check").click((e) => {
    // 打印订单的时候，把绿色的按钮当成参数发过去，表示打印“今日”还是“所有”
    $(".button.check").removeClass('green');
    $(e.target).addClass('green');

    var params = {
      "学校": $(".dropdown.school").dropdown("get value"),
      "开始时间": $(".dropdown.period").dropdown("get value").split(' - ')[0],
      "结束时间": $(".dropdown.period").dropdown("get value").split(' - ')[1],
      "宿舍楼": $(".dropdown.dormitory").dropdown("get value"),
      "日期范围": $("button.check.old").hasClass("green") ? "所有" : "今日",
    };

    $.ajax({
      url: '/order',
      type: 'get',
      // dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      data: JSON.stringify(params),
      data: params,
      success: (data) => {
        $(".orders.list .ui.segment").remove();
        $(".orders.list").append(data);
      },
    }).fail(window.ajaxCrash);
  });

  $("button.print").click((e) => {
    window.operationConfirm("打印订单", PrintOrders);
  });

  $("button.message-text").click((e) => {
    window.operationConfirm("发送短信提醒", SendTextMsg);
  });

  
  $("button.message-text-yunpian").click((e) => {
    window.operationConfirm("发送短信提醒（云片）", SendTextMsgYunPian);
  });

  
  $("button.wx-order-notice").click((e) => {
    window.operationConfirm("发送微信服务通知", sendWxOrderNotice);
  });
});
