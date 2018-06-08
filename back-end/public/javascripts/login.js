window.onload = function() {
    $(document).keyup(function(event) {
        // 按回车触发登录
        if (event.keyCode == 13)
            $("#confirm").trigger("click");
    });
    $('#confirm').click(function() {
        var clearText = $('#password').val();
        // 用blue-imp的md5加密后再传输
        var cipherText = md5(clearText);
        $.ajax({
            url: '/login',
            type: 'POST',
            dataType: 'json',
            data: {
                encryptedPassword: cipherText
            },
            success: function(data) {
                console.log(data)
                if (data.ok)
                    window.location.href = '/';
                else
                    $('#message').show();
            }
        });
    });
}