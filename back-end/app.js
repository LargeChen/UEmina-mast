var express = require('express');

var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
// 处理解析文件上传
var multipart = require('connect-multiparty');

var utils = require('./utils');
var config = require('./config');

// 各种子路由
var api = require('./routes/api');
var index = require('./routes/index');
var product = require('./routes/product');
var order = require('./routes/order');
var setting = require('./routes/setting');
var school = require('./routes/school');
var category = require('./routes/category');
var statistic = require('./routes/statistic');
var login = require('./routes/login');
var logout = require('./routes/logout');
var coupon = require('./routes/coupon');
var message = require('./routes/message');

// 主程序
var app = express();

// 选择视图渲染引擎
app.set('views', config.viewsPath);
app.set('view engine', 'jade');

// 创建需要的文件夹
[config.publicPath,
config.viewsPath,
config.uploadedFilePath,
config.productImagesFilePath,
config.storagePath,
].forEach(utils.promiseDirExists);

// 创建需要的文件
utils.promiseFileExists(config.settingsFilePath, config.defaultSettings); // 需storage存在

// 如果有favicon.ico就取消下行的注释
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multipart());
app.use(cookieParser(config.cookieSecret));
app.use(express.static(config.publicPath));

// 通过加密的Cookie验证是否为登录状态
app.use((req, res, next) => {
    if (req.signedCookies[config.cookieKeyName] == utils.getCookieValue())
        req.isAuthorized = true;
    next();
});

// 提供各种服♂务
app.use('/api', api);

app.use('/login', login);

// 使下面的页面请求只能在登录（带cookie）后才能进入
app.use((req, res, next) => {
    req.isAuthorized ? next() : res.redirect('/login');
});

app.use('/', index);
app.use('/product', product);
app.use('/order', order);
app.use('/setting', setting);
app.use('/school', school);
app.use('/category', category);
app.use('/statistic', statistic);
app.use('/logout', logout);
app.use('/coupon', coupon);
app.use('/message', message);

// 上面的路由都没有结束请求/响应循环即认为是404，传递错误给后面的错误处理中间件
app.use((req, res, next) => {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// 错误处理中间件
app.use((err, req, res, next) => {
    // 设置局部变量以供开发时显示
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // 渲染错误界面
    res.status(err.status || 500);
    res.render('error');
});

app.listen(config.serverPort, () => console.log('Listening at port %s ...', config.serverPort));

module.exports = app;

// 每天定时做点事
var dailyTasks = require("./dailyTasks");
dailyTasks.run();