var request = require('request');
var sha1 = require('sha1');
var config = require('./config');
var models = require('./models/models');
var Order = models.Order;
var Coupon = models.Coupon;

// 必须保证order为orderSchema中的形式
function printOrder(order, printerSN, /* printerKey, */ callback) {
    if (!(order instanceof Order)) throw new TypeError;
    Coupon.find({ _id: { $in: [ order.优惠券_id ] } }, (err, coupons) => {
        if (err || !coupons) {
            console.error(err);
            typeof callback === "function" && callback(err);
            return;
        }
        var coupon_str = coupons.length === 1 ? coupons[0].getNameSync() : "无";


        var user = config.feieyunUser;
        var stime = Math.floor(Date.now() / 1000);
        var sig = sha1(user + config.feieyunUKEY + stime);
        var apiname = "Open_printMsg";
        var sn = printerSN;
        var content = "";
    
        // 拼接打印内容
        content += "<CB>UE鲜果</CB><BR>";
        content += "商品列表<BR>";
        content += "--------------------------------<BR>";
        var items = order['商品条目'];
        for (let i = 0; i < items.length; i++) {
            var item = items[i];
            content += item['商品名'] + "  ￥" + item['单价'] + " * " + item['数量'] + "<BR>";
        }
        content += "--------------------------------<BR>";
        content += "使用优惠券：" + coupon_str + "<BR>";
        content += "配送费：" + order['运费'] + "元<BR>";
        content += "合计：￥" + order['支付金额'] + "<BR>";
        content += "配送地址：" + order["配送地址"]["学校"] + 
                   " " + order["配送地址"]["宿舍楼"] + 
                   " " + order["配送地址"]["宿舍号"] + 
                   "<BR>";
        if (order["完成时间"]) {
            content += ("订餐时间：" + order["完成时间"].toLocaleDateString() +
                    " " + order['完成时间'].toLocaleTimeString('en-US', { hour12: false }) +
                    "<BR>");
        }
        content += "联系电话：" + order["配送地址"]["电话"] + "<BR>";
        if (order["备注"] && order["备注"].length > 0) {
            content += "<B>" + "备注：" + order["备注"] + "</B><BR>";
        }
        content += "<B>" + order["配送地址"]["姓名"] + "</B>  <B>" + order["配送地址"]["宿舍楼"] + "</B><BR>"
        content += "<B>" + order["配送时段"]["开始时间"] + " - " + order["配送时段"]["结束时间"] + "</B><BR>";
        content += "<BR>";
        content += "<BR>";
        
        var form = {
            user: user,
            stime: stime,
            sig: sig,
            apiname: apiname,
            debug: "0",
            sn: sn,
            content: content,
        };
        // console.log(form);
    
        request.post({
            url: config.feieyunApiUrl,
            form: form,
        }, (err, httpRespone, body) => {
            if (err) {
                console.log(err);
                res.json({ ok: false });
                return;
            }
            // console.log(body);
            typeof callback === "function" && callback();
        });
    });
}

module.exports = printOrder;
