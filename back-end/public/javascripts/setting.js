$(document).ready(() => {
  $(".ui.dropdown").dropdown();

  // 点击了提交按钮后，获取页面上的信息
  // todo 发送异步POST请求
  $("#commit").click((event) => {
    var params = {
      "营业时间": {
        "开始时间": $("input[name='营业开始时间']").val(),
        "结束时间": $("input[name='营业结束时间']").val(),
      },
    }
    if($("input[name='用户口令']").val()) {
      params["用户口令"] = $.md5($("input[name='用户口令']").val());
    }
    console.log(params);
    $.ajax({
      url: '/setting',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(params),
      success: window.ajaxErrHandle
    });
  });
});