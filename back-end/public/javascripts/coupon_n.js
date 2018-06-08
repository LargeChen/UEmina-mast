$(document).ready(function () {
  // 选择券类型
  $(".dropdown.coupon-type").dropdown({
    onChange: (value, text, choice) => {
      $(".ui.header.hidden").removeClass('hidden');
      $(".coupon-form").addClass('hidden');
      switch (value) {
        case "1": {
          $(".coupon-form.coupon-type-1").removeClass('hidden');
          break;
        }
        case "2": {
          $(".coupon-form.coupon-type-2").removeClass('hidden');
          $.ajax({
            url: '/api/product_names',
            type: 'GET',
            dataType: 'json',
            success: (data) => {
              console.log(data);
              // 假装有异常处理
              var selector = ".field.product-name",
                classNames = "ui dropdown search fluid product-name",
                products = { "": "商品名" }; // 默认数据
              for (var pro of data.products) {
                products[pro] = pro;
              }
              $(".ui.dropdown.product-name").remove();
              console.log(products);
              window.setupDropdown(selector, classNames, products);
            },
          }).fail(window.ajaxCrash);
          break;
        }
        case "3": {
          $(".coupon-form.coupon-type-3").removeClass('hidden');
          $.ajax({
            url: '/api/categories',
            type: 'GET',
            dataType: 'json',
            success: (data) => {
              console.log(data);
              // 假装有异常处理
              var selector = ".field.category-name",
                classNames = "ui dropdown search fluid category-name",
                categories = { "": "类目名" }; // 默认数据
              for (var cat of data.categories) {
                categories[cat] = cat;
              }
              $(".ui.dropdown.category-name").remove();
              console.log(categories);
              window.setupDropdown(selector, classNames, categories);
            },
          }).fail(window.ajaxCrash);
          break;
        }
      }
    },
  });

  window.sendNewCouponQuery = function (data_to_send) {
    // 券的其他信息
    data_to_send['有效期'] = {
      "生效日期": $("input[name='生效日期']").val(),
      "失效日期": $("input[name='失效日期']").val()
    };

    data_to_send['得券原因'] = $("input[name='得券原因']").val();
    data_to_send['是否通知'] = $(".send-notice.checkbox").checkbox('is checked');
    data_to_send['每人发放量'] = $("input[name='每人发放量']").val();

    // 发送请求
    $.ajax({
      url: '/coupon/new',
      type: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(data_to_send),
      dataType: 'json',
      success: function (data) {
        console.log(data);
        swal('返回信息', data.message, 'success');
      }
    }).fail(window.ajaxCrash);
  }

  // 获取满减券信息
  window.sendType1Query = function (data_to_send) {
    data_to_send['优惠券类型'] = '满减券';
    data_to_send['优惠内容'] = {
      "价格要求": $("input[name='价格要求']").val(),
      "价格优惠": $("input[name='价格优惠']").val()
    };
    sendNewCouponQuery(data_to_send);
  }

  // 获取商品券信息
  window.sendType2Query = function (data_to_send) {
    data_to_send['优惠券类型'] = '商品券';
    data_to_send['优惠内容'] = {
      "商品名": $(".dropdown.product-name").dropdown('get value'),
      "优惠折扣": $("input[name='商品券折扣']").val()
    };
    sendNewCouponQuery(data_to_send);
  }

  // 获取类目券信息
  window.sendType3Query = function (data_to_send) {
    data_to_send['优惠券类型'] = '类目券';
    data_to_send['优惠内容'] = {
      "类目名": $(".dropdown.category-name").dropdown('get value'),
      "优惠折扣": $("input[name='类目券折扣']").val()
    };
    sendNewCouponQuery(data_to_send);
  }
});