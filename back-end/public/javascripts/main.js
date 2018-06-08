$(document).ready(() => {
  $.fn.dropdown.settings.forceSelection = false;
  window.ajaxRedirectUrl = '';
  // 一些AJAX操作的结果检查
  window.ajaxErrHandle = function(url) {
    window.ajaxRedirectUrl = url;
    return (data) => {
      if (data.code) {
        console.log(data);
        swal("", data.codeName, "error");
      } else {
        swal("操作成功", "", "success").then(()=>{
          if(window.ajaxRedirectUrl && window.ajaxRedirectUrl != "close") {
            window.location.href = window.ajaxRedirectUrl;
          }
          else if(window.ajaxRedirectUrl === "close") {
            window.close();
          }
        });
      }
    }
  }

  // AJAX出现未处理的错误时
  window.ajaxCrash = function() {
    swal("错误", "网络问题或错误请求...", "error");
  }

  // 删除某个东西时弹出来的提醒框
  window.deleteItem = function(url, params, itemName) {
    swal({
      title: '确定删除: ' + itemName + '?',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      // cancelButtonColor: '#d33',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    }).then(function() {
      $.ajax({
        url: url,
        type: 'DELETE',
        dataType: 'json',
        // contentType: 'application/json',
        data: params,
        success: window.ajaxErrHandle(url),
      }).fail(ajaxCrash);
    });
  }

  // 重新画下拉框
  window.setupDropdown = function(selector, classNames, data, params) {
    // selector 是下拉框要放的地方（父元素）
    /*
    data = {
      "": "Default text",
      value1: text1,
      value2: text2,
      ...
    };

    params = {
      onChange: callback,
      ...
    }
    */
    var slt = $("<select></select>").addClass(classNames);
    for(var p in data) {
      var html = "<option value='" + p + "'>" + data[p] + "</option>";
      slt.append(html);
    }
    $(selector).append(slt);
    slt.dropdown(params);
    return;
  }

   // 重新画多选下拉框
   window.setupMultipleDropdown = function(selector, classNames, data, params) {
    // selector 是下拉框要放的地方（父元素）
    /*
    data = {
      "": "Default text",
      value1: text1,
      value2: text2,
      ...
    };

    params = {
      onChange: callback,
      ...
    }
    */
    var slt = $('<select multiple="" />').addClass(classNames);
    for(var p in data) {
      var html = "<option value='" + p + "'>" + data[p] + "</option>";
      slt.append(html);
    }
    $(selector).append(slt);
    slt.dropdown(params);
    return;
  }

  window.operationConfirm = function(opName, opFunc) {
    swal({
      title: '确定操作: ' + opName + '?',
      type: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      // cancelButtonColor: '#d33',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    }).then(opFunc);
  }
});