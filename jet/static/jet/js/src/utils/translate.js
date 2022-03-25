module.exports = function(str) {
    if (window.django == undefined) {
        return str;
    }
    console.log(django);
    return django.gettext(str);
};
