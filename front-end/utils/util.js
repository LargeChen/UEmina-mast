function formatTime(date) {
  var year = date.getFullYear()
  var month = date.getMonth() + 1
  var day = date.getDate()

  var hour = date.getHours()
  var minute = date.getMinutes()
  var second = date.getSeconds()


  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

function formatNumber(n) {
  n = n.toString()
  return n[1] ? n : '0' + n
}

function checkInTime(begin_time, end_time) {
  // 把日期都设置为2017-3-12日
  var now = new Date();
  now.setFullYear(2017, 3 - 1, 12);

  var begin = new Date('2017/3/12 ' + begin_time);
  var end = new Date('2017/3/12 ' + end_time);

  return (begin < now && now < end)
}

function randomString(n) {
    n = n || 31;
    // 以下实现来自 http://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < n; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

module.exports = {
  formatTime: formatTime,
  checkInTime: checkInTime,
  randomString: randomString,
}