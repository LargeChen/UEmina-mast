$(document).ready(function() {
  // 新增类目
  $("#commit").click((e) => {
    var params = {
      "类目名": $(".fields.new").find('input[name="类目名"]').val(),
      "权重": $(".fields.new").find('input[name="权重"]').val(),
    }

    // 检查不为空
    for (var p in params) {
      if (!params[p] && p != "每日特惠") {
        swal("请完成表单：" + p, "", "info");
        return false;
      }
    }

    // 发送请求
    $.ajax({
      url: '/category',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(params),
      success: window.ajaxErrHandle('/category')
    }).fail(window.ajaxCrash);
  });

  // 更新类目
  $("button.update").click((e) => {
    var tar = $(e.target).parents(".category");
    var params = {
      "_id": $(tar).find('input[name="_id"]').val(),
      "类目名": $(tar).find('input[name="类目名"]').val(),
      "权重": $(tar).find('input[name="权重"]').val(),
    }

    // 检查不为空
    for (var p in params) {
      if (!params[p] && p != "每日特惠") {
        swal("请完成表单：" + p, "", "info");
        return false;
      }
    }

    // 发送请求
    $.ajax({
      url: '/category',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(params),
      success: window.ajaxErrHandle('/category')
    }).fail(window.ajaxCrash);
  });
});