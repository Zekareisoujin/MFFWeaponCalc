/* exported Cookie, ATTR_KEY, ATTR_VAL, TEXT */
/* global $ */
String.prototype.isEmpty = function () {
  return (this.length === 0 || !this.trim());
};

String.prototype.contains = function (s) {
  return this.indexOf(s) >= 0;
};

$.urlParam = function (key) {
  var results = new RegExp('[?&]' + key + '=([^&#]*)')
    .exec(window.location.href);
  if (results == null)
    return null;
  else
    return decodeURI(results[1]) || 0;
};

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

const ATTR_KEY = {
  PRESET: 'data-preset',
  ROW_IDX: 'data-row-id',
  CLOSE_ID: 'data-close-id',
  OPTION: 'data-option',
  OPTION_GROUP: 'data-option-group',
  CARD: 'data-card'
};

const ATTR_VAL = {
  BASE_STAT: 'preset-base',
  MIN_STAT: 'preset-min',
  MAX_STAT: 'preset-max',
  NATURAL_STAMINA_SP: 'natural-sp-stam',
  NATURAL_STAMINA_MP: 'natural-mp-stam',
  MOBIUS_DAY: 'mobius-day',
  BAHAMUT_LAGOON: 'bahamut-lagoon',
  VIP_MODE: 'vip-mode',
  STAMINA_LEVEL: 'stamina-level',
  JP_ONLY: 'jp-only',
  GROUP_BOOST: 'boost',
  GROUP_SEARCH: 'search',
  MOD_COUNT: 'mod-count'
};


const TEXT = {
  VALIDATION: {
    STAT_UNEVEN: "Unable to reach this value with a base stat of ",
    LOWERBOUND_EXCEEDED: "Value must not be lower than base stat of ",
    UPPERBOUND_EXCEEDED: "Value must not be higher than max stat of ",
    IS_NAN: "Value must be an integer.",
    INVALID_MOD_COUNT: "Number of modification done must be 1 less than \
    or equal to number of modification allowed by stat boosting.",
    MINIMUM_MOD_REQUIRED: "Number of modification done must be at least ",
    INVALID_ABILITY_VALUE: "This ability value is not achieveable.",
  },
  HINT: {
    MOD_DONE: "Total number of modifications made given \
    the number of stars & ability levels on the weapon.",
    MOD_ALLOWED: "Total number of modifications allowed given the number \
    of stat boosts made on the weapon. \
    Total modification done must not exceed this value.",
  },
  NOTIFICATION: {
    COOKIE_SAVED: 'Calculator data saved to cookie!',
    COOKIE_ERROR: 'Unable to load from cookie, data might be corrupted.',
    DATA_IMPORTED: 'Calculator data imported!',
    DATA_IMPORT_ERROR: 'Unable to import, data might be corrupted.'
  },
  MISC: {
    CLIPBOARD_COPIED: 'Copied to clipboard!',
    CLICK_TO_COPY: 'Click to copy'
  }
};