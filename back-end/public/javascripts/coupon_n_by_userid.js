$(document).ready(function () {
  $(".ui.dropdown.users").dropdown();

  // $(".dropdown.users").dropdown('get value') -> list
  function getUserList() {
    return $(".dropdown.users").dropdown('get value');
  }

  // 不同的发放方式，实现不同的这个函数，获取这个发放方式特有的数据
  function getThisWayData() {
    var data_to_send = {};
    // 各种发放方式不同的东西
    data_to_send["发放方式"] = "选择用户ID";
    data_to_send["用户ID列表"] = getUserList();
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