$(document).ready(function () {

  function getDormitoryForUserStatistic(school) {
    // 发送请求获取宿舍楼
    $.ajax({
      url: '/statistic/check/dorm_building',
      dataType: 'json',
      data: {
        '学校名': school,
      },
      success: (data) => {
        console.log(data);
        var selector = "#user-statistic .column.dormitory", // 下拉框的父元素
          classNames = "ui dropdown fluid dormitory",
          dormitories = {
            "": "宿舍楼",
          },
          params = {
            onChange: (value, text, choice) => {
              $("#user-statistic button.check").removeClass("disabled");
            },
          };

        for (var b of data.result) {
          dormitories[b] = b;
        }

        $("#user-statistic .ui.dropdown.dormitory").remove();
        window.setupDropdown(selector, classNames, dormitories, params);
      }
    }).fail(window.ajaxCrash);
  }


  $("#user-statistic .dropdown.school").dropdown({
    onChange: (value, text, choice) => {
      // 刚选完学校，让按钮失效，查询宿舍楼        
      $("#user-statistic button.check").addClass("disabled");
      getDormitoryForUserStatistic(value);
    },
  });

  // 宿舍下拉框 一开始应该是没有内容的
  $("#user-statistic .dropdown.dormitory").dropdown();

  // 绑定查询按钮点击事件
  $("#user-statistic button.check").click(() => {
    var school = $("#user-statistic .dropdown.school").dropdown("get value"),
      dormitory = $("#user-statistic .dropdown.dormitory").dropdown("get value");
    // 发送请求获取这个 学校+宿舍楼 的用户信息，填入那个表格里
    $.ajax({
      url: '/statistic/user',
      data: {
        '学校': school,
        '宿舍楼': dormitory,
      },
      success: (data) => {
        $("#user-statistic tbody.users tr").remove();
        $("#user-statistic tbody.users").append(data);
      }
    });
  });


  // ====================================================
  //               新订单统计
  // ====================================================

  function getDormitoryForOrderStatistic(school) {
    // 发送请求获取宿舍楼
    $.ajax({
      url: '/statistic/check/dorm_building',
      dataType: 'json',
      data: {
        '学校名': school,
      },
      success: (data) => {
        var all_dormitories = data.result;
        var selector = "#order-statistic .column.dormitory", // 下拉框的父元素
          classNames = "ui dropdown fluid search dormitory",
          dormitories = {
            "": "宿舍楼",
            "全选": "全选",
            "合计": "合计",
          },
          params = {
            onChange: (value, text, choice) => {
              $("#order-statistic .dropdown.dormitory").dropdown("remove selected", "全选");
              if (choice === "合计") {
                if (!Array.isArray(value) || value.length !== 1 || value[0] !== "合计") { // 递归
                  $("#order-statistic .dropdown.dormitory").dropdown("set exactly", ["合计"]);
                }
              } else if (choice === "全选") {
                $("#order-statistic .dropdown.dormitory").dropdown("set exactly", all_dormitories);
                // 刷新下 把全选标签去掉 其实不去掉也没关系
                setTimeout(() => $("#order-statistic .dropdown.dormitory").dropdown("remove selected", "全选"), 10);
              } else {
                $("#order-statistic .dropdown.dormitory").dropdown("remove selected", "合计");
              }
              checkIfCheckButtonEnabled();
            },
          };

        for (var b of data.result) {
          dormitories[b] = b;
        }

        $("#order-statistic .ui.dropdown.dormitory").remove();
        window.setupMultipleDropdown(selector, classNames, dormitories, params);
      }
    }).fail(window.ajaxCrash);
  }

  // 宿舍下拉框 一开始应该是没有内容的
  $("#order-statistic .dropdown.dormitory").dropdown();

  $("#order-statistic .dropdown.school").dropdown({
    onChange: (value, text, choice) => {
      if (value === "合计" || value === "全选") {
        $("#order-statistic .dropdown.dormitory").dropdown("clear").addClass("disabled");
        checkIfCheckButtonEnabled();
      } else {
        // 刚选完学校，让按钮失效，查询宿舍楼        
        $("#order-statistic button.check").addClass("disabled");
        getDormitoryForOrderStatistic(value);
      }
    },
  });

  function checkIfCheckButtonEnabled() {
    var start_date = $('input[name="开始时间"]').val();
    var end_date = $('input[name="结束时间"]').val();
    var school = $("#order-statistic .dropdown.school").dropdown("get value");
    var dormitories = $("#order-statistic .dropdown.dormitory").dropdown("get value");
    var check_button = $("#order-statistic button.check");
    if (start_date && end_date && (school === "合计" || school === "全选" ||
      (school && Array.isArray(dormitories) && dormitories.length > 0)))
      check_button.removeClass("disabled");
    else
      if (!check_button.hasClass("disabled"))
        check_button.addClass("disabled");
  }

  $('#order-statistic input[name="开始时间"]').change(checkIfCheckButtonEnabled);
  $('#order-statistic input[name="结束时间"]').change(checkIfCheckButtonEnabled);

  // 绑定查询按钮点击事件
  $("#order-statistic button.check").click(() => {
    var start_date = $('#order-statistic input[name="开始时间"]').val();
    var end_date = $('#order-statistic input[name="结束时间"]').val();
    var school = $("#order-statistic .dropdown.school").dropdown("get value");
    var dormitories = $("#order-statistic .dropdown.dormitory").dropdown("get value");

    var statistic_units = {};
    if (school === "合计") {
      statistic_units["合计"] = {};
    } else if (school === "全选") {
      statistic_units["全选"] = true;
    } else {
      statistic_units[school] = {};
      console.log(dormitories);
      for (let i in dormitories) {
        if (dormitories[i] === "全选") continue; // ignore 全选
        statistic_units[school][dormitories[i]] = {};
      }
    }
    // 发送请求获取信息填入那个表格里
    $.ajax({
      url: '/statistic/order',
      method: 'post',
      data: {
        '开始时间': start_date,
        '结束时间': end_date,
        '待统计单位': JSON.stringify(statistic_units),
      },
      success: (data) => {
        $("#order-statistic .statistic-result").empty().append(data);
        $("#order-statistic .statistic-result #total-result .download-csv.button").off("click").on("click", function() {
          $('#total-result table.table.total').table2csv("订单统计总表", true);
        });
        $("#order-statistic .statistic-result #everyday-result .download-csv.button").off("click").on("click", function() {
          $('#everyday-result table.table.everyday').table2csv("订单统计分日期表", true);
        });
        $("#order-statistic .statistic-result #everyorder-result .download-csv.button").off("click").on("click", function() {
          $('#everyorder-result table.table.everyorder').table2csv("订单统计详细交易数据表", true);
        });
        // 说不需要显示出来
        $('#everyorder-result table.table.everyorder').hide();
      }
    });
  });

  $("#order-statistic .analysis-result .download-csv.button").hide();

  // ====================================================
  //               用户分析
  // ====================================================

  function getDormitoryForUserAnalysis(school) {
    // 发送请求获取宿舍楼
    $.ajax({
      url: '/statistic/check/dorm_building',
      dataType: 'json',
      data: {
        '学校名': school,
      },
      success: (data) => {
        var all_dormitories = data.result;
        var selector = "#user-analysis .column.dormitory", // 下拉框的父元素
          classNames = "ui dropdown fluid search dormitory",
          dormitories = {
            "": "宿舍楼",
            "合计": "合计",
          },
          params = {
            onChange: checkIfAnalysisButtonEnabled,
          };

        for (var b of data.result) {
          dormitories[b] = b;
        }

        $("#user-analysis .ui.dropdown.dormitory").remove();
        window.setupDropdown(selector, classNames, dormitories, params);
        $("#user-analysis .ui.dropdown.dormitory").dropdown("set selected", "合计").dropdown("save defaults");
      }
    }).fail(window.ajaxCrash);
  }

  // 宿舍下拉框 一开始应该是没有内容的
  $("#user-analysis .dropdown.dormitory").dropdown();

  // 这是啥意思啊
  $("#user-analysis .dropdown.dimension").dropdown({
    onChange: (value, text, choice) => {
      checkIfAnalysisButtonEnabled();
    }
  });

  $("#user-analysis .dropdown.school").dropdown({
    onChange: (value, text, choice) => {
      if (value === "合计") {
        $("#user-analysis .dropdown.dormitory").dropdown("clear").addClass("disabled");
      } else {
        getDormitoryForUserAnalysis(value);
      }
      checkIfAnalysisButtonEnabled();
    },
  });

  function checkIfAnalysisButtonEnabled() {
    var date_base = $('#user-analysis input[name="时间基准"]').val();
    var dimension = $("#user-analysis .dropdown.dimension").dropdown("get value");
    var school = $("#user-analysis .dropdown.school").dropdown("get value");
    var dormitories = $("#user-analysis .dropdown.dormitory").dropdown("get value");
    var check_button = $("#user-analysis button.check");
    if (date_base && dimension && (school === "合计" || (school && dormitories)))
      check_button.removeClass("disabled");
    else
      if (!check_button.hasClass("disabled"))
        check_button.addClass("disabled");
  }

  $('#user-analysis input[name="时间基准"]').change(checkIfAnalysisButtonEnabled);

  // 绑定查询按钮点击事件
  $("#user-analysis button.check").click(() => {
    var date_base = $('#user-analysis input[name="时间基准"]').val();
    var dimension = $("#user-analysis .dropdown.dimension").dropdown("get value");
    var school = $("#user-analysis .dropdown.school").dropdown("get value");
    var dormitories = $("#user-analysis .dropdown.dormitory").dropdown("get value");
    if (dormitories && dormitories.length === 1 && dormitories[0] === "合计") {
      dormitories = "合计";
    }
    console.log(dimension, school, dormitories);
    // 发送请求获取信息填入那个表格里
    $.ajax({
      url: '/statistic/user',
      method: 'post',
      data: {
        '时间基准': date_base,
        '学校': school,
        '宿舍楼': (school === "合计" ? undefined : dormitories),
        '收入维度': dimension,
      },
      success: (data) => {
        if (!data.ok) {
          console.log("服务器说错误啦，数据为", data);
          return;
        }

        (function () {

          /* ========================================
           |         填充各用户类型统计结果         |
           ======================================== */

          var analysis_results = data.results.analysis_results;

          $('#user-analysis .analysis-result tbody').empty();

          var userTypes = ['全部用户', '活跃用户', '付费用户', '一般用户', '核心用户', '新增用户', '流失用户'];
          var columns = ['用户类型', '学校', '宿舍楼', '人数', '人数占比', '时间基准', '收入维度', '总收入', '收入占比', '订单量', '客单价', '人均消费', '人均订单量']

          var $tbody = $('#user-analysis .analysis-result tbody');
          for (var i = 0; i < userTypes.length; i++) {
            var userType = userTypes[i];
            console.log("准备处理用户类型为：", userType, "具体数据为：", analysis_results[userType]);
            $tbody.append($(`<tr class="${userType}"></tr>`));
            for (var j = 0; j < columns.length; j++) {
              var column = columns[j];
              $(`#user-analysis .analysis-result tbody tr.${userType}`)
                .append($(`<td> ${analysis_results[userType][column]} </td>`));
            }
          }

          $("#user-analysis .analysis-result .download-csv.button").off("click").on("click", function() {
            $('#user-analysis .analysis-result table.table').table2csv("用户统计", true);
          });

          $("#user-analysis .container.analysis-result").show();
        })();


        (function () {
          /* ===============================================
            |         填充用户详细交易数据表统计结果         |
            ================================================ */

          var everyone_results = data.results.everyone_results;
          
          $('#user-analysis .everyone-result tbody').empty();

          var $tbody = $('#user-analysis .everyone-result tbody');
          var columns = ['学校', '宿舍', '宿舍号', '名字', '电话', '性别', '用户类型', '时间基准', '收入维度', '消费总额', '订单数', '客单价', '历史订单数', '初次登录日期'];
          for (var i = 0; i < everyone_results.length; i++) {
            var row = everyone_results[i];
            var $tr = $('<tr></tr>');
            for (let j = 0; j < columns.length; j++) {
              var column = columns[j];
              $tr.append($(`<td> ${row[column]} </td>`));
            }
            $tbody.append($tr);
          }

          console.log("外面！");
          $("#user-analysis .everyone-result .download-csv.button").off("click").on("click", function() {
            $('#user-analysis .everyone-result table.table').table2csv("用户详细交易数据统计", true);
          });

          $("#user-analysis .container.everyone-result").show();
          $("#user-analysis .everyone-result table").hide();
        })();
      }
    });
  });

  $("#user-analysis .container.analysis-result").hide();
  $("#user-analysis .container.everyone-result").hide();

  ////////////////////////////////////////////////
  //        每日订单统计的详细内容显示开关
  ////////////////////////////////////////////////

  $("#today-order-statistic .toggle.checkbox").checkbox({
    onChecked: function () {
      $("#today-order-statistic table.statistic-result").show();
    },
    onUnchecked: function () {
      $("#today-order-statistic table.statistic-result").hide();
    },
  });

  // 先隐藏
  $("#today-order-statistic table.statistic-result").hide();
  // 再设置开关状态为关闭
  $("#today-order-statistic .toggle.checkbox").checkbox("set unchecked");

  
  
  ////////////////////////////////////////////////
  //        每日商品统计的详细内容显示开关
  ////////////////////////////////////////////////

  $("#today-product-statistic .toggle.checkbox").checkbox({
    onChecked: function () {
      $("#today-product-statistic table.statistic-result").show();
      $("#today-product-statistic .button.blue.download-csv").show();
    },
    onUnchecked: function () {
      $("#today-product-statistic table.statistic-result").hide();
      $("#today-product-statistic .button.blue.download-csv").hide();
    },
  });

  // 先隐藏
  $("#today-product-statistic table.statistic-result").hide();
  $("#today-product-statistic .button.blue.download-csv").hide();
      // 再设置开关状态为关闭
  $("#today-product-statistic .toggle.checkbox").checkbox("set unchecked");


  ////////////////////////////////////////////////
  //            撤掉旧的用户统计
  ////////////////////////////////////////////////

  $("#user-statistic").hide();


  $("#today-product-statistic .download-csv.button").off("click").on("click", function() {
    $('#today-product-statistic table.table.statistic-result').table2csv("每日商品统计", true);
  });

});