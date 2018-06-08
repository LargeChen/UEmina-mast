var express = require('express');
var router = express.Router();

// 主页
router.get('/', (req, res, next) => {
    // 重定向到商品页
    res.redirect('/product');
});

module.exports = router;
