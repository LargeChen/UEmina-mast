$(document).ready(() => {
  $(".ui.dropdown").dropdown();

  // 点击了提交按钮后，获取页面上的信息
  // todo 发送异步POST请求
  $("#commit").click((event) => {
    var attrs = [];
    $(".fields.attrs").each((n, el) => {
      var tmp = {
        "属性名称": $(el).find(".attribute").val(),
        "属性值": $(el).find(".value").val(),
      };
      if(tmp["属性名称"] && tmp['属性值']) {
        attrs.push(tmp);
      }
    });

    var thumbnails = [];
    $("#thumbnails").find(".dz-filename").each((n, el) => {
      thumbnails.push($(el).text());
    });

    var detialsMap = [];
    $("#detials-map").find(".dz-filename").each((n, el) => {
      detialsMap.push($(el).text());
    });

    var params = {
      "商品名": $("input[name='商品名']").val(),
      "权重": $("input[name='权重']").val(),
      "单价": $("input[name='单价']").val(),
      "库存": $("input[name='库存']").val(),
      "默认库存": $("input[name='默认库存']").val(),
      "重置开关": $(".checkbox.reset-toggle").checkbox("is checked"),
      "每日特惠": $(".checkbox.sale").checkbox("is checked"),
      "类目": $(".dropdown.category").dropdown("get value"),
      "导购语": $("input[name='导购语']").val(),
      "规格": attrs,
      "标签": $(".dropdown.labels").dropdown("get value"),
      "缩略图": thumbnails,
      "详情图": detialsMap,
    };

    for(var p in params) {
      if (!params[p] && p != "重置开关" && p != "每日特惠") {
        swal("请完成表单："+p, "", "info");
        return false;
      }
    }

    // send POST
    $.ajax({
      url: '/product/new',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(params),
      success: window.ajaxErrHandle('/product')
    }).fail(window.ajaxCrash);

  });

  // 点击 新增规格 后出现
  $(".add-attr").click((event) => {
    $(".all-attrs").append($(`
      <div class="two fields attrs">
        <div class="field">
          <input type="text" class="attribute">
        </div>
        <div class="field">
          <input type="text" class="value">
        </div>
        <i class="icon close"></i>
      </div>
    `));
    // 点叉叉就移除
    $("i.icon.close").click((event) => {
      $(event.target).parent(".attrs").remove();
    });
  });

  $(".add-attr").click();

  $(".add-attr").css('cursor', 'pointer');
});


function removeImgFile(file) {
  // 如果没上传成功就直接删除
  if (file.status === 'error') {
    $(file.previewElement).remove();
  // 如果上传成功就向服务器请求删除文件
  } else if (file.status === 'success') {
    $.ajax({
      method: 'delete',
      url: '/api/upload/img',
      data: { filename: file.name }
    }).done(() => {
      // 删除成功就在页面上清掉预览图
      $(file.previewElement).remove();  
    });
  }
}

Dropzone.options.thumbnails = {
  paramName: "thumbnails",
  maxFilesize: 2, // MB
  maxFiles: 5,
  acceptedFiles: 'image/*',
  addRemoveLinks: true,
  dictDefaultMessage: '请添加五张以下的不同名的小于1MB的缩略图',
  dictRemoveFile: '移除缩略图',
  removedfile: removeImgFile,
};

Dropzone.options.detialsMap = {
  paramName: "detialsMap",
  maxFilesize: 5, // MB
  maxFiles: 10,
  acceptedFiles: 'image/*',
  addRemoveLinks: true,
  dictDefaultMessage: '请添加十张以下的不同名的小于5MB的详情图',
  dictRemoveFile: '移除详情图',
  removedfile: removeImgFile,
};