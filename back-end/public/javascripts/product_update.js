$(document).ready(() => {
  $(".ui.dropdown").dropdown();

  // 点击了提交按钮后，获取页面上需要更改的信息
  $("#commit").click((event) => {
    var attrs = [];
    $(".fields.attrs").each((n, el) => {
      var tmp = {
        "属性名称": $(el).find(".attribute").val(),
        "属性值": $(el).find(".value").val(),
      };
      if (tmp["属性名称"] && tmp['属性值']) {
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
      "_id": $("input[name='_id']").val(),
      "商品名": $("input[name='商品名']").val(),
      "权重": $("input[name='权重']").val(),
      "单价": $("input[name='单价']").val(),
      "库存": $("input[name='库存']").val(),
      "默认库存": $("input[name='默认库存']").val(),
      "在售": $(".checkbox.for-sale").checkbox("is checked"),
      "重置开关": $(".checkbox.reset-toggle").checkbox("is checked"),
      "每日特惠": $(".checkbox.sale").checkbox("is checked"),
      "类目": $(".dropdown.category").dropdown("get value"),
      "导购语": $("input[name='导购语']").val(),
      "规格": attrs,
      "标签": $(".dropdown.labels").dropdown("get value"),
    };

    if(thumbnails.length) {
      params["缩略图"] = thumbnails;
    }

    if(detialsMap.length) {
      params["详情图"] = detialsMap;
    }

    for (var p in params) {
      if (!params[p] && p != "在售" && p != "重置开关" && p != "每日特惠") {
        swal("请完成表单：" + p, "", "info");
        return false;
      }
    }

    // send POST
    $.ajax({
      url: '/product/update',
      type: 'POST',
      dataType: 'json',
      contentType: 'application/json',
      data: JSON.stringify(params),
      success: window.ajaxErrHandle('close')
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

  $(".add-attr").css('cursor', 'pointer');

  { // 把复选框和下拉框的内容填回去
    // 在售、上架
    if ($("input[name='for-sale']").val() === 'true') {
      $(".checkbox.for-sale").checkbox('set checked');
    }

    // 每日特惠
    if ($("input[name='pro-sale']").val() === 'true') {
      $(".checkbox.sale").checkbox('set checked');
    }

    // 重置库存按钮
    if ($("input[name='reset-toggle']").val() === 'true') {
      $(".checkbox.reset-toggle").checkbox('set checked');
    }

    $(".dropdown.category").dropdown('set selected', $("input[name='pro-category']").val());
    $(".dropdown.labels").dropdown('set selected', $("input[name='pro-labels']").val());
  }
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
      data: {
        filename: file.name
      }
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
  dictDefaultMessage: '若需修改缩略图，请添加五张以下的不同名的小于1MB的缩略图（原有的将全被舍弃）',
  dictRemoveFile: '移除缩略图',
  removedfile: removeImgFile,
};

Dropzone.options.detialsMap = {
  paramName: "detialsMap",
  maxFilesize: 5, // MB
  maxFiles: 10,
  acceptedFiles: 'image/*',
  addRemoveLinks: true,
  dictDefaultMessage: '若需修改详情图，请添加十张以下的不同名的小于5MB的详情图（原有的将全被舍弃）',
  dictRemoveFile: '移除详情图',
  removedfile: removeImgFile,
};