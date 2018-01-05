String.prototype.isEmpty = function () {
    return (this.length === 0 || !this.trim());
}

String.prototype.contains = function (s) {
    return this.indexOf(s) >= 0;
}

$.urlParam = function (key) {
    var results = new RegExp('[\?&]' + key + '=([^&#]*)').exec(window.location.href);
    if (results == null)
        return null;
    else
        return decodeURI(results[1]) || 0;
}

var Cookie = {
    setCookie: function (name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    },
    getCookie: function (name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    },
    eraseCookie: function (name) {
        document.cookie = name + '=; Max-Age=-99999999;';
    }
};