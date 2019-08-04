/* global $, WeaponBoostDB, WeaponCard, WeaponSlot, Cookie, JSONC
ATTR_KEY, ATTR_VAL, TEXT */
(function () {

  const NATURAL_STAMINA = 12 * 24,
    MOBIUS_DAY_BONUS = 1, // 100% more stamina
    BAHAMUT_LAGOON_MULTIPLER = 1.5,
    VIP_MULTIPLIER = 4/3,
    BASE_MULTIPLIER = 6,
    PATH_PARAM_IMPORT = 'import',
    COOKIE_NAME = 'boost-data',
    COOKIE_DURATION = 180;

  var _db, _wBoostSlots = {},
    _settings = {},
    $wSearch, $wSelect, $wAdd, $wBoostArea, $controlPanel,
    $saveCookie, $exportModal, $importModal, $resetAll, $notificationBox,
    $wSelectOptions = {};


  function _init() {
    $.getJSON('js/db.json', data => {
      WeaponBoostDB(data)
        .then((loadedDB) => {
          _db = loadedDB;
          _initializeComponents();
          _bindComponents();
          _initializeData();
          _filterSelectList('');
        });
    });
  };

  function _initializeComponents() {
    $wSelect = $('#weapon-select');
    $wSearch = $('#weapon-search');
    $wAdd = $('#weapon-add');
    $wBoostArea = $('#weapon-boost-area');
    $controlPanel = $('#control-panel');
    $saveCookie = $('#save-cookie');
    $exportModal = $('#exportModal');
    $importModal = $('#importModal');
    $resetAll = $('#reset-all');
    $notificationBox = $('#notification-all');

    $('[data-toggle="tooltip"]')
      .tooltip();

    for (var wId in _db.weapon) {
      var wData = _db.weapon[wId];
      $wSelectOptions[wId] = $('<option>')
        .text(wData.name)
        .val(wId);
      $wSelect.append($wSelectOptions[wId]);
      WeaponCard.decorate($wSelectOptions[wId], wData);
    }

    $('#control-panel input')
      .each(function (idx, element) {
        _retrieveSetting($(element));
      });
  };

  function _bindComponents() {
    $wAdd.click(_onWeaponAddClick);
    // throttle keyword search, since moving the DOM element is costly
    $wSearch.on('input', $.debounce(_onWeaponSearchInput, 250));
    $controlPanel.find('input')
      .change(_onSettingsChange);
    $saveCookie.click(_saveToCookie);
    $exportModal.find('.export-group input[type="text"]')
      .focus(_clickToCopyFocus)
      .blur(_clickToCopyBlur);
    $exportModal.on('show.bs.modal', _onExportModalOpen);
    $importModal.on('show.bs.modal', _onImportModalOpen);
    $importModal.find('.btn-modal')
      .click(_onImportingSettings);
    $resetAll.click(_resetCalculator);
  };

  function _initializeData() {
    var importPathParam = $.urlParam(PATH_PARAM_IMPORT) ||
      Cookie.getCookie(COOKIE_NAME);
    if (importPathParam)
      try {
        _applyImportData(importPathParam);
      } catch (e) {
        Cookie.eraseCookie(COOKIE_NAME);
        _showNotification(TEXT.NOTIFICATION.COOKIE_ERROR);
      }
  };

  function _addWeaponSlot(wId, initialStats) {
    $wSelect.find('option:selected')
      .prop('disabled', true);
    var weaponSlot = WeaponSlot({
      weaponData: _db.weapon[wId],
      initialStats: initialStats,
      userOptions: _generateUserOptions()
    }, $wBoostArea);
    weaponSlot.render();
    _wBoostSlots[wId] = weaponSlot;
    weaponSlot.$control.remove.attr(ATTR_KEY.CLOSE_ID, wId)
      .click(_onWeaponRemoveClick);
  }

  function _onWeaponAddClick() {
    var wId = $wSelect.val();
    if (wId) {
      _addWeaponSlot(wId);
    }
  }

  function _removeWeaponSlot(wId) {
    var $element = _wBoostSlots[wId].$element;
    _wBoostSlots[wId] = {};
    delete _wBoostSlots[wId];
    $element.remove();
    $wSelectOptions[wId].prop('disabled', false);
  }

  function _onWeaponRemoveClick(wId) {
    var wId = $(this)
      .attr(ATTR_KEY.CLOSE_ID);
    _removeWeaponSlot(wId);
  }

  function _filterSelectList(key) {
    var jpOnly = _settings[ATTR_VAL.JP_ONLY];

    if (key.isEmpty()) {
      for (var id in $wSelectOptions)
        if (jpOnly || !_db.weapon[id].jpOnry)
          $wSelectOptions[id].show();
        else
          $wSelectOptions[id].hide();
    } else {
      for (var id in $wSelectOptions) {
        $wSelectOptions[id].hide();
      }
      _db.search(key)
        .forEach(function (wId) {
          if (jpOnly || !_db.weapon[wId].jpOnry)
            $wSelectOptions[wId].show()
            .appendTo($wSelect);
        });
    }
  }

  function _onWeaponSearchInput() {
    var key = $wSearch.val();
    _filterSelectList(key);
  }

  function _generateUserOptions() {
    var staminaLevel = _settings[ATTR_VAL.STAMINA_LEVEL];
    var staminaMultiplier = BASE_MULTIPLIER;
    var bonusStamina = 0;
    var dailyStamina = 0;

    if (_settings[ATTR_VAL.MOBIUS_DAY])
      bonusStamina += staminaLevel * MOBIUS_DAY_BONUS;
    if (_settings[ATTR_VAL.BAHAMUT_LAGOON])
      staminaMultiplier *= BAHAMUT_LAGOON_MULTIPLER;
    if (_settings[ATTR_VAL.VIP_MODE])
      staminaMultiplier *= VIP_MULTIPLIER;
    if (_settings[ATTR_VAL.NATURAL_STAMINA_SP])
      dailyStamina += NATURAL_STAMINA;
    if (_settings[ATTR_VAL.NATURAL_STAMINA_MP])
      dailyStamina += NATURAL_STAMINA;

    return {
      staminaLevel: staminaLevel,
      staminaMultiplier: staminaMultiplier,
      bonusStamina: bonusStamina,
      dailyStamina: dailyStamina
    };
  }

  function _retrieveSetting($element) {
    var type = $element.attr('type');
    var option = $element.attr(ATTR_KEY.OPTION);

    switch (type) {
      case 'checkbox':
        _settings[option] = $element.prop('checked');
        break;
      case 'number':
        _settings[option] = parseInt($element.val());
        break;
      default:
        _settings[option] = $element.val();
        break;
    }
  }

  function _onSettingsChange() {
    _retrieveSetting($(this));
    var optionGroup = $(this)
      .attr(ATTR_KEY.OPTION_GROUP);

    switch (optionGroup) {
      case ATTR_VAL.GROUP_BOOST:
        var userOptions = _generateUserOptions();
        for (var wId in _wBoostSlots) {
          _wBoostSlots[wId].updateBoostCost(userOptions);
        }
        break;
      case ATTR_VAL.GROUP_SEARCH:
        _onWeaponSearchInput();
        break;
      default:
        break;
    }
  }

  function _saveToCookie() {
    var packedExportData = _generateExportData();
    Cookie.setCookie(COOKIE_NAME, packedExportData, COOKIE_DURATION);
    _showNotification(TEXT.NOTIFICATION.COOKIE_SAVED);
  }

  function _clickToCopyFocus() {
    $(this)
      .select();
    document.execCommand('Copy');
    $(this)
      .siblings('p')
      .text(TEXT.MISC.CLIPBOARD_COPIED);
  }

  function _clickToCopyBlur() {
    $(this)
      .siblings('p')
      .text(TEXT.MISC.CLICK_TO_COPY);
  }

  function _generateExportData() {
    var boostData = {};
    for (var wId in _wBoostSlots) {
      boostData[wId] = _wBoostSlots[wId].exportData();
    }

    return JSONC.pack({
      weaponBoostData: boostData,
      settings: _settings
    });
  }

  function _onExportModalOpen() {
    var packedExportData = _generateExportData();
    var exportUrl = window.location.href + '?' +
      PATH_PARAM_IMPORT + '=' + packedExportData;
    $exportModal.find('.export-code')
      .val(packedExportData);
    $exportModal.find('.export-url')
      .val(exportUrl);
  }

  function _onImportModalOpen() {
    $importModal.find('input[type=text]')
      .val("");
  }

  function _applyImportData(packedData) {
    _resetCalculator();
    var data = JSONC.unpack(packedData);
    _settings = data.settings || _settings;

    for (var option in _settings) {
      var selector = '#control-panel input[' +
        ATTR_KEY.OPTION + '=' + option + ']';
      var value = _settings[option];
      switch (typeof value) {
        case "boolean":
          $(selector)
            .prop('checked', value);
          break;
        default:
          $(selector)
            .val(value);
          break;
      }
    }

    var boostData = data.weaponBoostData;
    for (var wId in boostData) {
      _addWeaponSlot(wId, boostData[wId]);
    }
  }

  function _onImportingSettings() {
    var packedImportData = $importModal.find('input[type=text]')
      .val()
      .trim();
    if (!packedImportData.isEmpty()) {
      try {
        _applyImportData(packedImportData);
        _showNotification(TEXT.NOTIFICATION.DATA_IMPORTED);
      } catch (e) {
        _showNotification(TEXT.NOTIFICATION.DATA_IMPORT_ERROR);
      }
    }
  }

  function _resetCalculator() {
    for (var wId in _wBoostSlots) {
      _removeWeaponSlot(wId);
    }
  }

  function _showNotification(msg) {
    $notificationBox.text(msg);
    $notificationBox.fadeIn()
      .delay(2000)
      .fadeOut();
  }

  _init();
})();