// 本后台程序的相关设置项

const path = require('path');

// 使得 node app.js 可以带参数
const program = require('commander');

// 此program参数设定
program
    .option('-d, --debug', 'running program in debug mode')
    .option('-p, --port [port]', 'program\'s port [port]')
    .parse(process.argv);

const root = __dirname;
const public = path.join(root, 'public'); // 可直接url访问，存静态文件
const views = path.join(root, 'views'); // 存放视图模板
const uploaded = path.join(public, 'uploaded'); // 用于存放上传的文件，可直接url访问
const uploadedImages = path.join(uploaded, 'tempImages'); // 供新增图片时上传以候选，每次都清空
const storage = path.join(root, 'storage'); // 用于类似数据库的储存，存放单个文档等小的内容
const settings = path.join(storage, 'settings.json'); // 存放各种设置，如营业时间，登录口令等
const productImages = path.join(public, 'productImages'); // 存放商品的缩略图和详情图

const cookieKeyName = 'alive';
const secret = 'sysuat';

const databaseHost = '127.0.0.1';
const databasePort = '27017';
const databaseName = 'uemina';


let defaultServerUrl = 'https://15842571.qcloud.la';
let defaultServerPort = 80;
let debugServerUrl = 'http://127.0.0.1';
let debugServerPort = 9090;
const serverUrl = program.url || (program.debug ? debugServerUrl : defaultServerUrl);
const serverPort = program.port || (program.debug ? debugServerPort : defaultServerPort);

const appId = 'wxaf49ef2917767d6c';
const appSecret = 'f3b98d01d71dcb61227fc6a20950f918';
const mchId = '1442805302';
const paymentKey = '884a27322bd0bf1287e58a30b54ea26b';

const paymentNotifyUrl = '/api/payment_notify';

const textMessageUrl = 'http://web.1xinxi.cn/asmx/smsservice.aspx';
const textMessageAcount = '15521216538';
const textMessagePwd = '91A4203EA6D8F19B498D9F8A1B1A';
const textMessageSign = 'UE鲜果';

// const printerSN = "917504082"; // 917500812
// const printerKey = "5b9aygm3"; // s4ywh2jh
const feieyunApiUrl = "http://api.feieyun.cn/Api/Open/";
const feieyunUser = "uefruitapp@163.com";
const feieyunUKEY = "mEc9rKC9WjtZFHju";

// 云片网
// const textMessageYunPianUrl = 'https://sms.yunpian.com/v1/sms/send.json';
const textMessageYunPianUrl = 'https://sms.yunpian.com/v2/sms/single_send.json';
const textMessageYunPianUrl_batch = 'https://sms.yunpian.com/v2/sms/batch_send.json';
const textMessageYunPianApikey = '0c5d9641d909e46eac6a7065ffad4e9e';
const textMessageYunPianApikey_yinxiao = 'f105a058f54c21a0b389a5a5b3ef67a3';

const UPDATE_USER_TYPE__HOUR = 23;
const UPDATE_USER_TYPE__MINUTE = 30;

const AUTO_DISTRIBUTE_COUPON__HOUR = 11;
const AUTO_DISTRIBUTE_COUPON__MINUTE = 25;

// %s 指券的内容
const 自动发七天满减券短信提醒内容模板 = "一周没吃水果啦，快来补点维生素，限时专享果券已经放入您的账户啦，%s哦！回T退订";
const 自动发十四天满减券短信提醒内容模板 = "还记得我吗？一别就是两周，吃点水果对身体有好处哦，限时专享果券已经放入您的账户啦，%s哦！回T退订";
const 自动发三十天满减券短信提醒内容模板 = "真不敢相信你就这样离开小U了，对我们的服务有建议可以直接联系小U的微信哦，我们将认真采纳。另外，一张超大的限时专享果券已经放入您的账户了，%s哦！回T退订";
const 自动发舍友满减券短信提醒内容模板 = "舍友专享券已到！把小U推荐给您的舍友，首次下单后您将获得限时果券，%s哦，来一起吃水果吧～回T退订";
const 自动首次付费满减券短信提醒内容模板 = "感谢对ue鲜果的支持！！小U已经偷偷放了限时专享果券到您的账户里，%s哦～回T退订";
const 手动发券短信提醒内容模板 = "小U已经偷偷往你的账户里塞了%s张限时专享果券！%s哦，快来吧，慢了水果就让别人吃完啦～回T退订";

const 自动发的满减券的有效期天数时长 = 4;

const defaultSettings = '{"营业时间":{"开始时间":"11:30","结束时间":"21:00"},"加密口令":"47167e7db0226f92721bd26f6a2374d7"}';

module.exports = {
    rootPath: root,
    publicPath: public,
    viewsPath: views,
    uploadedFilePath: uploaded,
    uploadedImagePath: uploadedImages,
    storagePath: storage,
    settingsFilePath: settings,
    productImagesFilePath: productImages,

    databaseHost: databaseHost,
    databasePort: databasePort,
    databaseName: databaseName,

    serverPort: serverPort,
    serverUrl: serverUrl,

    appId: appId,
    appSecret: appSecret,
    mchId: mchId,
    paymentKey: paymentKey,

    paymentNotifyUrl: paymentNotifyUrl,

    cookieKeyName: cookieKeyName,
    cookieSecret: secret,

    textMessageUrl: textMessageUrl,
    textMessageAcount: textMessageAcount,
    textMessagePwd: textMessagePwd,
    textMessageSign: textMessageSign,

    // printerSN: printerSN,
    // printerKey: printerKey,
    feieyunApiUrl: feieyunApiUrl,
    feieyunUser: feieyunUser,
    feieyunUKEY: feieyunUKEY,

    textMessageYunPianUrl: textMessageYunPianUrl,
    textMessageYunPianUrl_batch: textMessageYunPianUrl_batch,
    textMessageYunPianApikey: textMessageYunPianApikey,
    textMessageYunPianApikey_yinxiao: textMessageYunPianApikey_yinxiao,

    UPDATE_USER_TYPE__HOUR: UPDATE_USER_TYPE__HOUR,
    UPDATE_USER_TYPE__MINUTE: UPDATE_USER_TYPE__MINUTE,

    AUTO_DISTRIBUTE_COUPON__HOUR: AUTO_DISTRIBUTE_COUPON__HOUR,
    AUTO_DISTRIBUTE_COUPON__MINUTE: AUTO_DISTRIBUTE_COUPON__MINUTE,

    defaultSettings: defaultSettings,

    自动发七天满减券短信提醒内容模板: 自动发七天满减券短信提醒内容模板,
    自动发十四天满减券短信提醒内容模板: 自动发十四天满减券短信提醒内容模板,
    自动发三十天满减券短信提醒内容模板: 自动发三十天满减券短信提醒内容模板,
    自动发舍友满减券短信提醒内容模板: 自动发舍友满减券短信提醒内容模板,
    自动首次付费满减券短信提醒内容模板: 自动首次付费满减券短信提醒内容模板,


    自动发的满减券的有效期天数时长: 自动发的满减券的有效期天数时长,
    手动发券短信提醒内容模板: 手动发券短信提醒内容模板,
};
