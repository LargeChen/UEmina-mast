$(document).ready(function () {
  $(".ui.dropdown:not(.coupon-type)").dropdown();

  function getUserTypes() {
    let params = {
      "学校名": $(".dropdown.school").dropdown("get value"),
      "宿舍楼": $(".dropdown.dormitory").dropdown("get value")
    };
    $.ajax({
      url: '/api/types_of_user',
      type: 'GET',
      dataType: 'json',
      // contentType: 'application/json',
      data: params,
      success: (data) => {
        console.log(data);
        // 假装有异常处理
        let selector = ".column.user-type",
          classNames = "ui dropdown fluid user-type",
          user_types = { "": "用户类型" }; // 默认数据
        for (var type of data.types) {
          user_types[type.type_name] = type.type_name + '(' + type.count + ')';
        }
        $(".ui.dropdown.user-type").remove();
        console.log(user_types);
        window.setupDropdown(selector, classNames, user_types);
      },
    }).fail(window.ajaxCrash);
  }

  function getDormitory() {
    let params = {
      "学校名": $(".dropdown.school").dropdown("get value")
    };

    if (params["学校名"] === "全部") {
      let selector = ".column.dormitory",
      classNames = "ui dropdown fluid dormitory",
      dormitories = {
        "": "宿舍楼",
        "全部": "全部",
      }, // 只有这些数据
      param = {
        onChange: (value, text, choice) => {
          getUserTypes();
        }
      };
      $(".ui.dropdown.dormitory").remove();
      window.setupDropdown(selector, classNames, dormitories, param);
      $(".ui.dropdown.dormitory").dropdown("set selected", "全部").dropdown("save defaults").addClass("disabled");

    } else {
      $.ajax({
        url: '/api/dormitories',
        type: 'GET',
        dataType: 'json',
        // contentType: 'application/json',
        data: params,
        success: (data) => {
          console.log(data);
          // 假装有异常处理
          var selector = ".column.dormitory",
            classNames = "ui dropdown fluid dormitory",
            dormitories = {
              "": "宿舍楼",
              "全部": "全部",
            }, // 默认数据
            param = {
              onChange: (value, text, choice) => {
                getUserTypes();
              }
            };
          for (var dor of data.dormitories) {
            dormitories[dor] = dor;
          }
          $(".ui.dropdown.dormitory").remove();
          console.log(dormitories);
          window.setupDropdown(selector, classNames, dormitories, param);
          $(".ui.dropdown.dormitory").dropdown("set selected", "全部").dropdown("save defaults");
        },
      }).fail(window.ajaxCrash);
    }
  }

  $(".dropdown.school").dropdown({
    onChange: (value, text, choice) => {
      getDormitory();
    },
  });


  // 不同的发放方式，实现不同的这个函数，获取这个发放方式特有的数据
  function getThisWayData() {
    var data_to_send = {};
    // 各种发放方式不同的东西
    data_to_send["发放方式"] = "选择用户类型";
    data_to_send["学校名"] = $(".dropdown.school").dropdown('get value');
    data_to_send["宿舍楼"] = $(".dropdown.dormitory").dropdown('get value');
    data_to_send["用户类型"] = $(".dropdown.user-type").dropdown('get value');
    
    console.log(data_to_send);
    return data_to_send;
  }

  $("#create-type-1-coupon").click(function () {
    var send = function () {
      // 优惠券内容
      sendType1Query(getThisWayData());
    }
    window.operationConfirm("发放优惠券", send);
  });


  $("#create-type-2-coupon").click(function () {
    var send = function () {
      // 优惠券内容
      sendType2Query(getThisWayData());
    }
    window.operationConfirm("发放优惠券", send);
  });


  $("#create-type-3-coupon").click(function () {
    var send = function () {
      // 优惠券内容
      sendType3Query(getThisWayData());
    }
    window.operationConfirm("发放优惠券", send);
  });

  $(".ui.dropdown.school").dropdown("set selected", "全部").dropdown("save defaults");
  // $(".ui.dropdown.dormitory").dropdown("set selected", "全部").dropdown("save defaults").addClass("disabled");
});