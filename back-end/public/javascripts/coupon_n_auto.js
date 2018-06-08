$(document).ready(function() {
  // 初始化各个checkbox的状态
  if($('input[name="7天券开启状态"]').val() == 'true') {
    $('.checkbox.7day').checkbox('check');
  }
  if($('input[name="14天券开启状态"]').val() == 'true') {
    $('.checkbox.14day').checkbox('check');
  }
  if($('input[name="30天券开启状态"]').val() == 'true') {
    $('.checkbox.30day').checkbox('check');
  }
  if($('input[name="舍友券开启状态"]').val() == 'true') {
    $('.checkbox.roommate').checkbox('check');
  }
  if($('input[name="新用户券开启状态"]').val() == 'true') {
    $('.checkbox.newuser').checkbox('check');
  }
  if($('input[name="首次付费券开启状态"]').val() == 'true') {
    $('.checkbox.firstpay').checkbox('check');
  }

  function send_update(type, enable, require, cutprice, reason, count, validity) {
    var data_to_send = {
      发券方式: type,
      开启: enable,
      价格要求: require,
      价格优惠: cutprice,
      得券原因: reason,
      发送数量: count,
      有效时长: validity
    }

    $.ajax({
      url: '/coupon/auto_settings',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(data_to_send),
      success: window.ajaxErrHandle
    });
  }


  $("#commit-7day").click(() => {
    var enable = $('.checkbox.7day').checkbox('is checked'),
      require = $('input[name="7天券价格要求"]').val(),
      cutprice = $('input[name="7天券价格优惠"]').val(),
      reason = $('input[name="7天券得券原因"]').val(),
      count = $('input[name="7天券发送数量"]').val(),
      validity = $('input[name="7天券有效时长"]').val();
    
    send_update("七天满减", enable, require, cutprice, reason, count, validity);
  });

  $("#commit-14day").click(() => {
    var enable = $('.checkbox.14day').checkbox('is checked'),
      require = $('input[name="14天券价格要求"]').val(),
      cutprice = $('input[name="14天券价格优惠"]').val(),
      reason = $('input[name="14天券得券原因"]').val(),
      count = $('input[name="14天券发送数量"]').val(),
      validity = $('input[name="14天券有效时长"]').val();
    
    send_update("十四天满减", enable, require, cutprice, reason, count, validity);
  });

  $("#commit-30day").click(() => {
    var enable = $('.checkbox.30day').checkbox('is checked'),
      require = $('input[name="30天券价格要求"]').val(),
      cutprice = $('input[name="30天券价格优惠"]').val(),
      reason = $('input[name="30天券得券原因"]').val(),
      count = $('input[name="30天券发送数量"]').val(),
      validity = $('input[name="30天券有效时长"]').val();
    
    send_update("三十天满减", enable, require, cutprice, reason, count, validity);
  });

  $("#commit-roommate").click(() => {
    var enable = $('.checkbox.roommate').checkbox('is checked'),
      require = $('input[name="舍友券价格要求"]').val(),
      cutprice = $('input[name="舍友券价格优惠"]').val(),
      reason = $('input[name="舍友券得券原因"]').val(),
      count = $('input[name="舍友券发送数量"]').val(),
      validity = $('input[name="舍友券有效时长"]').val();
    
    send_update("舍友满减", enable, require, cutprice, reason, count, validity);
  });

  $("#commit-newuser").click(() => {
    var enable = $('.checkbox.newuser').checkbox('is checked'),
      require = $('input[name="新用户券价格要求"]').val(),
      cutprice = $('input[name="新用户券价格优惠"]').val(),
      reason = $('input[name="新用户券得券原因"]').val(),
      count = $('input[name="新用户券发送数量"]').val(),
      validity = $('input[name="新用户券有效时长"]').val();
    
    send_update("新用户满减", enable, require, cutprice, reason, count, validity);
  });

  $("#commit-firstpay").click(() => {
    var enable = $('.checkbox.firstpay').checkbox('is checked'),
      require = $('input[name="首次付费券价格要求"]').val(),
      cutprice = $('input[name="首次付费券价格优惠"]').val(),
      reason = $('input[name="首次付费券得券原因"]').val(),
      count = $('input[name="首次付费券发送数量"]').val(),
      validity = $('input[name="首次付费券有效时长"]').val();
    
    send_update("首次付费满减", enable, require, cutprice, reason, count, validity);
  });
});