$(document).ready(function() {
  $('.ui.dropdown').dropdown();
  $('#download-field').hide();

  $('#download-csv-button').click(function() {
    var filename_data = {
      "开始时间": $('input[name="开始时间"]').val(),
      "结束时间": $('input[name="结束时间"]').val(),
      "发放方式": $('.dropdown.coupon-way').dropdown('get value')
    };
    var filename = filename_data["开始时间"] + '_' + filename_data["结束时间"] + '_' + filename_data["发放方式"];
    $('table.cp-statistic').table2csv(filename);
  });

  $('#query-static').click(function() {
    var data_to_send = {
      "开始时间": $('input[name="开始时间"]').val(),
      "结束时间": $('input[name="结束时间"]').val(),
      "发放方式": $('.dropdown.coupon-way').dropdown('get value')
    };

    console.log(data_to_send);

    $.ajax({
        url: '/coupon/coupon_statistic',
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify(data_to_send),
        success: function (data) {
          console.log(data);
          // 清除可能存在的旧数据
          $('table.cp-statistic').remove();
          // 显示获得的新统计数据
          $('.ui.container.cp-statistic').append(data);
          // 显示下载按钮
          $('#download-field').show();
          // 顺便激活按钮
          $('#download-csv-button').removeClass('disabled');
        }
      }).fail(window.ajaxCrash);
  });
});