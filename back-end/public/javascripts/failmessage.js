$(document).ready(function() {
  $(".set-done").click(function() {
    var _id = $(this).attr('_id');
    var set_to = $(this).attr('set-to') === "true"; 
    var that = this;
    $.ajax({
        url: '/message/set_done',
        dataType: 'json',
        method: 'POST',
        data: {
          '_id': _id,
          '已处理': set_to
        },
        success: (data) => {
          console.log(data);
          if(!data.ok) {
              return false;
          }
          $(that).parents("tr").children('.status').text(set_to? "已处理": "未处理");
          $(that).attr('set-to', !set_to? "true": "false");
        }
      }).fail(window.ajaxCrash);
  });
  
  $("#resend-all").click(function() {
    operationConfirm("重发所有未处理短信", function() {
      $.ajax({
        url: '/message/resend',
        dataType: 'json',
        success: window.ajaxErrHandle('close')
      }).fail(window.ajaxCrash);
    });
  });
});