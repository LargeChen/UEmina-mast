$(document).ready(function () {
  function getPhoneList() {
    return $("textarea[name='phone-numbers']").val().split('\n');
  }

  // 不同的发放方式，实现不同的这个函数，获取这个发放方式特有的数据
  function getThisWayData() {
    var data_to_send = {};
    // 各种发放方式不同的东西
    data_to_send["发放方式"] = "选择用户手机号";
    data_to_send["手机号列表"] = getPhoneList();
    // console.log(data_to_send);
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
});