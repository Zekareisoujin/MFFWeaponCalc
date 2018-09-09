/* exported WeaponCard */
/* global $, ATTR_KEY, ATTR_VAL */
const WeaponCard = (function () {

  const TEMPLATE_ID = '#weapon-card-template',
    REPLACEABLE_TOKEN = 'replace-this',
    TEXT_FIELD = ['name', 'class', 'origin'],
    NUMBER_FIELD = ['hp', 'attack', 'break', 'magic'],
    STAR_FIELD = ['critical', 'speed', 'defense'],
    STAR_CHAR = '&#9733',
    EMPTY_CHAR = '&nbsp;',
    SELECTOR = TEMPLATE_ID + ' [' + ATTR_KEY.CARD + '=' +
    REPLACEABLE_TOKEN + ']',
    STAT_FACTOR = { 'hp': 10, 'attack': 1, 'break': 1, 'magic': 1 };

  var $template, $abilityTbody, $wThumbs;

  function _init() {
    $template = $(TEMPLATE_ID);
    $abilityTbody = $(TEMPLATE_ID + ' table tbody');
    $wThumbs = $(TEMPLATE_ID + ' img');
  }

  function _decorate($element, wData) {
    $element.popover({
      html: true,
      trigger: 'hover',
      placement: 'right',
      container: 'body',
      content: function () {
        return _generatePopoverContent(wData);
      }
    });
  }

  function _generatePopoverContent(wData) {
    TEXT_FIELD.forEach(function (key) {
      $(SELECTOR.replace(REPLACEABLE_TOKEN, key))
        .text(wData[key]);
    });

    NUMBER_FIELD.forEach(function (key) {
      $(SELECTOR.replace(REPLACEABLE_TOKEN, key))
        .text(wData[key] * STAT_FACTOR[key]);
    });

    STAR_FIELD.forEach(function (key) {
      $(SELECTOR.replace(REPLACEABLE_TOKEN, key))
        .html(wData[key] == 0 ? EMPTY_CHAR : STAR_CHAR.repeat(wData[key]));
    });

    $abilityTbody.empty();
    for (var aId in wData.abilities) {
      var aData = wData.abilities[aId];
      if (aData) {
        var startingValue = (wData.startingRanks[aId] == 0 ?
          $('<b>')
          .append($('<i>')
            .text(aData.startingValue)) : aData.startingValue);
        var $tr = $('<tr>')
          .appendTo($abilityTbody);
        $('<td>')
          .text(aData.name)
          .appendTo($tr);
        $('<td>')
          .html(startingValue)
          .addClass('text-center')
          .appendTo($tr);
        $('<td>')
          .text(aData.finalValue)
          .addClass('text-center')
          .appendTo($tr);
      }
    }

    $wThumbs.attr('src', wData.thumbnailUrl);
    $(SELECTOR.replace(REPLACEABLE_TOKEN, ATTR_VAL.MOD_COUNT))
      .text(wData.getCalc()
        .totalBoostModCounts.totalModCount);

    return $template.html();
  }

  _init();
  return {
    decorate: _decorate
  };
})();
