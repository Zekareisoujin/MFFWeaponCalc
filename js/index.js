/* global $, WeaponBoostDB, WeaponSlot, Cookie, JSONC
ATTR_KEY, ATTR_VAL, TEXT */
(function () {

  const NATURAL_STAMINA = 12 * 24,
    MOBIUS_DAY_BONUS = 1, // 100% more stamina
    BAHAMUT_LAGOON_MULTIPLER = 1.5,
    BASE_MULTIPLIER = 3,
    PATH_PARAM_IMPORT = 'import',
    COOKIE_NAME = 'boost-data',
    COOKIE_DURATION = 180;

  var _db, _wBoostSlots = {},
    $wSearch, $wSelect, $wAdd, $wBoostArea,
    $boostSettings, $otherSettings,
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
    $boostSettings = $('#boost-settings input');
    $otherSettings = $('#other-settings input');
    $saveCookie = $('#save-cookie');
    $exportModal = $('#exportModal');
    $importModal = $('#importModal');
    $resetAll = $('#reset-all');
    $notificationBox = $('#notification-all');

    $('[data-toggle="tooltip"]')
      .tooltip();

    for (var wId in _db.weapon) {
      var weaponData = _db.weapon[wId];
      $wSelectOptions[wId] = $('<option>')
        .text(weaponData.name)
        .val(wId);
      $wSelect.append($wSelectOptions[wId]);
    }
  };

  function _bindComponents() {
    $wAdd.click(_onWeaponAddClick);
    $wSearch.on('input', _onWeaponSearchInput);
    $boostSettings.change(_boostSettingsChange);
    $otherSettings.change(_onWeaponSearchInput);
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
      _applyImportData(importPathParam);
  };

  function _addWeaponSlot(wId, initialStats) {
    $wSelect.find('option:selected')
      .prop('disabled', true);
    var weaponSlot = WeaponSlot({
      db: _db,
      weaponId: wId,
      initialStats: initialStats,
      userOptions: _generateUserOptions(_getBoostSettings())
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
    var otherSettings = _getOtherSettings();
    var jpOnly = otherSettings['checkbox'][ATTR_VAL.JP_ONLY];

    if (key.isEmpty()) {
      for (var id in $wSelectOptions)
        if (jpOnly || !_db.weapon[id].jpOnry)
          $wSelectOptions[id].show();
        else
          $wSelectOptions[id].hide();
    } else {
      for (var id in $wSelectOptions) {
        var match = (_db.weapon[id].name.toLowerCase()
            .contains(key) ||
            _db.weapon[id].origin.toLowerCase()
            .contains(key) ||
            _db.weapon[id].class.toLowerCase()
            .contains(key)) &&
          (jpOnly || !_db.weapon[id].jpOnry);
        match ?
          $wSelectOptions[id].show() :
          $wSelectOptions[id].hide();
      }
    }
  }

  function _onWeaponSearchInput() {
    var key = $wSearch.val()
      .toLowerCase();
    _filterSelectList(key);
  }

  function _getBoostSettings() {
    var boostSettings = {};

    $boostSettings.each(function (index, element) {
      var type = $(element)
        .attr('type');
      var option = $(element)
        .attr(ATTR_KEY.OPTION);
      if (!boostSettings[type])
        boostSettings[type] = {};
      switch (type) {
        case 'checkbox':
          boostSettings[type][option] = $(element)
            .prop('checked');
          break;
        case 'number':
          boostSettings[type][option] = parseInt($(element)
            .val());
          break;
        default:
          boostSettings[type][option] = $(element)
            .val();
          break;
      }
    });

    return boostSettings;
  }

  function _getOtherSettings() {
    var otherSettings = {};

    $otherSettings.each(function (index, element) {
      var type = $(element)
        .attr('type');
      var option = $(element)
        .attr(ATTR_KEY.OPTION);
      if (!otherSettings[type])
        otherSettings[type] = {};
      switch (type) {
        case 'checkbox':
          otherSettings[type][option] = $(element)
            .prop('checked');
          break;
        case 'number':
          otherSettings[type][option] = parseInt($(element)
            .val());
          break;
        default:
          otherSettings[type][option] = $(element)
            .val();
          break;
      }
    });

    return otherSettings;
  }

  function _generateUserOptions(boostSettings) {
    var staminaLevel = boostSettings['number'][ATTR_VAL.STAMINA_LEVEL];
    var staminaMultiplier = BASE_MULTIPLIER;
    var bonusStamina = 0;
    var dailyStamina = 0;

    if (boostSettings['checkbox'][ATTR_VAL.MOBIUS_DAY])
      bonusStamina += staminaLevel * MOBIUS_DAY_BONUS;
    if (boostSettings['checkbox'][ATTR_VAL.BAHAMUT_LAGOON])
      staminaMultiplier *= BAHAMUT_LAGOON_MULTIPLER;
    if (boostSettings['checkbox'][ATTR_VAL.NATURAL_STAMINA_SP])
      dailyStamina += NATURAL_STAMINA;
    if (boostSettings['checkbox'][ATTR_VAL.NATURAL_STAMINA_MP])
      dailyStamina += NATURAL_STAMINA;

    return {
      staminaLevel: staminaLevel,
      staminaMultiplier: staminaMultiplier,
      bonusStamina: bonusStamina,
      dailyStamina: dailyStamina
    };
  }

  function _boostSettingsChange() {
    var boostSettings = _getBoostSettings();
    var userOptions = _generateUserOptions(boostSettings);
    for (var wId in _wBoostSlots) {
      _wBoostSlots[wId].updateBoostCost(userOptions);
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
    var weaponBoostData = {};
    for (var wId in _wBoostSlots) {
      weaponBoostData[wId] = _wBoostSlots[wId].exportData();
    }

    return JSONC.pack({
      weaponBoostData: weaponBoostData,
      boostSettings: _getBoostSettings(),
      otherSettings: _getOtherSettings()
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

  function _applyImportData(packedImportData) {
    var data = JSONC.unpack(packedImportData);

    var boostSettings = data.boostSettings;
    for (var inputType in boostSettings) {
      for (var option in boostSettings[inputType]) {
        var selector = '#boost-settings input[type=' + inputType +
          '][' + ATTR_KEY.OPTION + '=' + option + ']';
        switch (inputType) {
          case 'checkbox':
            $(selector)
              .prop('checked', boostSettings[inputType][option]);
            break;
          default:
            $(selector)
              .val(boostSettings[inputType][option]);
            break;
        }
      }
    }

    var otherSettings = data.otherSettings;
    for (var inputType in otherSettings) {
      for (var option in otherSettings[inputType]) {
        var selector = '#other-settings input[type=' + inputType +
          '][' + ATTR_KEY.OPTION + '=' + option + ']';
        switch (inputType) {
          case 'checkbox':
            $(selector)
              .prop('checked', otherSettings[inputType][option]);
            break;
          default:
            $(selector)
              .val(otherSettings[inputType][option]);
            break;
        }
      }
    }

    for (var wId in _wBoostSlots) {
      _removeWeaponSlot(wId);
    }

    var weaponBoostData = data.weaponBoostData;
    for (var wId in weaponBoostData) {
      _addWeaponSlot(wId, weaponBoostData[wId]);
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