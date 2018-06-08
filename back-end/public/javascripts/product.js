function removeFromShelf(id) {
  var params = {
    '_id': id,
    '在售': false,
  };
  $.ajax({
    url: '/product/update',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(params),
    success: window.ajaxErrHandle('/product'),
  }).fail(window.ajaxCrash);
}

function putOnShelf(id) {
  var params = {
    '_id': id,
    '在售': true,
  };
  $.ajax({
    url: '/product/update',
    type: 'POST',
    dataType: 'json',
    contentType: 'application/json',
    data: JSON.stringify(params),
    success: window.ajaxErrHandle('/product'),
  }).fail(window.ajaxCrash);
}

$(document).ready(function () {
  $("#reset-inventory").click(function () {
    operationConfirm("重置库存", function () {
      $.ajax({
        url: '/product/reset_inventory',
        type: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        success: window.ajaxErrHandle('/product'),
      }).fail(window.ajaxCrash);
    });
  });
});