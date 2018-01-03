String.prototype.isEmpty = function () {
    return (this.length === 0 || !this.trim());
}

String.prototype.contains = function (s) {
    return this.indexOf(s) >= 0;
}