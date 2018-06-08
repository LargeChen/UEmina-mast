$(document).ready(() => {
  $(".ui.dropdown").dropdown();

  // 点击了提交按钮后，获取页面上的信息
  $("#commit").click((event) => {
    var times = [];
    $(".fields.times").each((n, el) => {
      console.log(n, el);
      var tmp = {
        "下单开始时间": $(el).find(".place-order.time-begin").val(),
        "下单结束时间": $(el).find(".place-order.time-end").val(),
        "配送开始时间": $(el).find(".delivery.time-begin").val(),
        "配送结束时间": $(el).find(".delivery.time-end").val(),
      };
      if (tmp["下单开始时间"] && tmp["下单结束时间"] && 
          tmp["配送开始时间"] && tmp["配送结束时间"]) {
        times.push({
          "下单时段": {
            "开始时间": tmp["下单开始时间"],
            "结束时间": tmp["下单结束时间"],
          },
          "配送时段": {
            "开始时间": tmp["配送开始时间"],
            "结束时间": tmp["配送结束时间"],
          },
        });
      }
    });
    var printer = {
      "SN码": $("input[name='打印机SN码']").val(),
      "KEY": $("input[name='打印机KEY']").val(),
    }
    var service = {
      "电话": $("input[name='客服电话']").val(),
      "微信": $("input[name='客服微信']").val(),
    }
    console.log(times);
    var params = {
      "学校名": $("input[name='学校名']").val(),
      "起送价": $("input[name='起送价']").val(),
      "运费": $("input[name='运费']").val(),
      "交易时段": times,
      "打印机信息": printer,
      "客服": service,
      // remove spaces and split by ','
      "宿舍楼": $("textarea[name='宿舍楼']").val().replace(/\s/g, '').replace(/，/g, ',').split(','),
    }
    console.log(params);
    
    for(var p in params) {
      // 空的表单，宿舍楼为['']时，提示
      if(!params[p] || (p === "宿舍楼" && params[p][0] === '')) {
        swal("请完成表单："+p, "", "info");
        return false;
      }
    }
    
    // send POST
    $.ajax({
      url: '/school/new',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(params),
      success: window.ajaxErrHandle('/school'),
    }).fail(window.ajaxCrash);
  });
  
  // 点击 新增交易时段 后出现
  $(".add-time").click((event) => {
    $(".all-times").append($(`
      <div class="four fields times">
        <div class="field">
          <input type="time" class="place-order time-begin">
        </div>
        <div class="field">
          <input type="time" class="place-order time-end">
        </div>
        <div class="field">
          <input type="time" class="delivery time-begin">
        </div>
        <div class="field">
          <input type="time" class="delivery time-end">
        </div>
        <i class="icon ui close"></i>
      </div>
    `));
    // 点叉叉就移除
    $("i.icon.close").click((event) => {
      $(event.target).parent(".times").remove();
    });
  });

  $(".add-time").click();

  $(".add-time").css('cursor', 'pointer');
});