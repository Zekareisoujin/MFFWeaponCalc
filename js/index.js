const NATURAL_STAMINA = 12 * 24;
const MOBIUS_DAY_BONUS = 1; // 100% more stamina
const BAHAMUT_LAGOON_MULTIPLER = 1.5;
const BASE_MULTIPLIER = 3;

const OPTION_NATURAL_STAMINA_SP = 'natural-sp-stam';
const OPTION_NATURAL_STAMINA_MP = 'natural-mp-stam';
const OPTION_MOBIUS_DAY = 'mobius-day';
const OPTION_BAHAMUT_LAGOON = 'bahamut-lagoon';
const OPTION_STAMINA_LEVEL = 'stamina-level';

const ATTR_CLOSE_ID = 'data-close-id';
const ATTR_OPTION = 'data-option';

const PATH_PARAM_IMPORT = 'import';

const COOKIE_NAME = 'boost-data';
const COOKIE_DURATION = 180;

const WeaponCalcIndex = function () {

    var db;
    var weaponBoostSlots = {};
    var $weaponSearch, $weaponSelect, $weaponAdd, $weaponBoostArea;
    var $boostSettings, $otherSettings;
    var $weaponSelectOptions = {};

    var initialize = function () {
        $.getJSON('js/db.json', data => {
            WeaponBoostDB(data).then((loadedDB) => {
                db = loadedDB;
                initializeComponents();
                bindComponents();
                initializeData();
            });
        });
    };

    var initializeComponents = function () {
        $weaponSelect = $('#weapon-select');
        $weaponSearch = $('#weapon-search');
        $weaponAdd = $('#weapon-add');
        $weaponBoostArea = $('#weapon-boost-area');
        $boostSettings = $('#boost-settings input');
        $otherSettings = $('#other-settings input');
        $saveCookie = $('#save-cookie');
        $exportModal = $('#exportModal');
        $importModal = $('#importModal');
        $resetAll = $('#reset-all');
        $notificationBox = $('#notification-all');

        $('[data-toggle="tooltip"]').tooltip();

        for (var weaponId in db.weapon) {
            var weaponData = db.weapon[weaponId];
            $weaponSelectOptions[weaponId] = $('<option>').text(weaponData.name).val(weaponId);
            $weaponSelect.append($weaponSelectOptions[weaponId]);
        }
    };

    var bindComponents = function () {
        $weaponAdd.click(onWeaponAddClick);
        $weaponSearch.on('input', filterSelectList);
        $boostSettings.change(boostSettingsChange);
        $saveCookie.click(saveToCookie);
        $exportModal.find('.export-group input[type="text"]').focus(clickToCopyFocus).blur(clickToCopyBlur);
        $exportModal.on('show.bs.modal', onExportModalOpen);
        $importModal.on('show.bs.modal', onImportModalOpen);
        $importModal.find('.btn-modal').click(onImportingSettings);
        $resetAll.click(resetCalculator);
    };

    var initializeData = function () {
        var importPathParam = $.urlParam(PATH_PARAM_IMPORT) || Cookie.getCookie(COOKIE_NAME);
        if (importPathParam)
            applyImportData(importPathParam);

    };

    var addWeaponSlot = function (weaponId, initialStats) {
        $weaponSelect.find('option:selected').prop('disabled', true);
        weaponSlot = WeaponSlot({
            db: db,
            weaponId: weaponId,
            initialStats: initialStats,
            userOptions: generateUserOptions(getBoostSettings())
        }, $weaponBoostArea);
        weaponSlot.render();
        weaponBoostSlots[weaponId] = weaponSlot;
        weaponSlot.$removeButton.attr(ATTR_CLOSE_ID, weaponId).click(onWeaponRemoveClick);
    }

    var onWeaponAddClick = function () {
        var weaponId = $weaponSelect.val();
        if (weaponId) {
            addWeaponSlot(weaponId);
        }
    }

    var removeWeaponSlot = function (weaponId) {
        var $element = weaponBoostSlots[weaponId].$element;
        weaponBoostSlots[weaponId] = {};
        delete weaponBoostSlots[weaponId];
        $element.remove();
        $weaponSelectOptions[weaponId].prop('disabled', false);
    }

    var onWeaponRemoveClick = function (weaponId) {
        var weaponId = $(this).attr(ATTR_CLOSE_ID);
        removeWeaponSlot(weaponId);
    }

    var filterSelectList = function (e) {
        var key = $(this).val().toLowerCase();
        if (key.isEmpty()) {
            for (var id in $weaponSelectOptions)
                $weaponSelectOptions[id].show();
        } else {
            for (var id in $weaponSelectOptions) {
                var match = db.weapon[id].name.toLowerCase().contains(key)
                    || db.weapon[id].origin.toLowerCase().contains(key)
                    || db.weapon[id].class.toLowerCase().contains(key);
                match ? $weaponSelectOptions[id].show() : $weaponSelectOptions[id].hide();
            }
        }
    }

    var getBoostSettings = function () {
        var boostSettings = {}

        $boostSettings.each(function (index, element) {
            var type = $(element).attr('type');
            var option = $(element).attr(ATTR_OPTION);
            if (!boostSettings[type])
                boostSettings[type] = {};
            switch (type) {
                case 'checkbox':
                    boostSettings[type][option] = $(element).prop('checked');
                    break;
                case 'number':
                    boostSettings[type][option] = parseInt($(element).val());
                    break;
                default:
                    boostSettings[type][option] = $(element).val();
                    break;
            }
        });

        return boostSettings;
    }

    var generateUserOptions = function (boostSettings) {
        var staminaLevel = boostSettings['number'][OPTION_STAMINA_LEVEL];
        var staminaMultiplier = BASE_MULTIPLIER;
        var bonusStamina = 0;
        var dailyStamina = 0;

        if (boostSettings['checkbox'][OPTION_MOBIUS_DAY])
            bonusStamina += staminaLevel * MOBIUS_DAY_BONUS;
        if (boostSettings['checkbox'][OPTION_BAHAMUT_LAGOON])
            staminaMultiplier *= BAHAMUT_LAGOON_MULTIPLER;
        if (boostSettings['checkbox'][OPTION_NATURAL_STAMINA_SP])
            dailyStamina += NATURAL_STAMINA;
        if (boostSettings['checkbox'][OPTION_NATURAL_STAMINA_MP])
            dailyStamina += NATURAL_STAMINA;

        return {
            staminaLevel: staminaLevel,
            staminaMultiplier: staminaMultiplier,
            bonusStamina: bonusStamina,
            dailyStamina: dailyStamina
        }
    }

    var boostSettingsChange = function (e) {
        var boostSettings = getBoostSettings();
        var userOptions = generateUserOptions(boostSettings);
        for (var weaponId in weaponBoostSlots) {
            weaponBoostSlots[weaponId].updateBoostCost(userOptions);
        }
    }

    var saveToCookie = function () {
        var packedExportData = generateExportData();
        Cookie.setCookie(COOKIE_NAME, packedExportData, COOKIE_DURATION);
        showNotification('Calculator data saved to cookie!');
    }

    var clickToCopyFocus = function () {
        $(this).select();
        document.execCommand('Copy');
        $(this).siblings('p').text('Copied to clipboard!');
    }

    var clickToCopyBlur = function () {
        $(this).siblings('p').text('Click to copy');
    }

    var generateExportData = function () {
        var weaponBoostData = {};
        for (var weaponId in weaponBoostSlots) {
            weaponBoostData[weaponId] = weaponBoostSlots[weaponId].exportData();
        }

        return JSONC.pack({
            weaponBoostData: weaponBoostData,
            boostSettings: getBoostSettings()
        });
    }

    var onExportModalOpen = function () {
        var packedExportData = generateExportData();
        var exportUrl = window.location.href + '?' + PATH_PARAM_IMPORT + '=' + packedExportData;
        $exportModal.find('.export-code').val(packedExportData);
        $exportModal.find('.export-url').val(exportUrl);
    }

    var onImportModalOpen = function () {
        $importModal.find('input[type=text]').val("");
    }

    var applyImportData = function (packedImportData) {
        var data = JSONC.unpack(packedImportData);

        var boostSettings = data.boostSettings
        for (var inputType in boostSettings) {
            for (var option in boostSettings[inputType]) {
                var selector = '#boost-settings input[type=' + inputType + '][' + ATTR_OPTION + '=' + option + ']';
                switch (inputType) {
                    case 'checkbox':
                        $(selector).prop('checked', boostSettings[inputType][option]);
                        break;
                    default:
                        $(selector).val(boostSettings[inputType][option]);
                        break;
                }
            }
        }

        for (var weaponId in weaponBoostSlots) {
            removeWeaponSlot(weaponId);
        }

        var weaponBoostData = data.weaponBoostData;
        for (var weaponId in weaponBoostData) {
            addWeaponSlot(weaponId, weaponBoostData[weaponId]);
        }
    }

    var onImportingSettings = function () {
        var packedImportData = $importModal.find('input[type=text]').val().trim();
        if (!packedImportData.isEmpty()) {
            try {
                applyImportData(packedImportData);
                showNotification('Calculator data imported!');
            } catch (e) {
                showNotification('Unable to import, data might be corrupted.');
            }
        }
    }

    var resetCalculator = function () {
        for (var weaponId in weaponBoostSlots) {
            removeWeaponSlot(weaponId);
        }
    }

    var showNotification = function (msg) {
        $notificationBox.text(msg);
        $notificationBox.fadeIn().delay(2000).fadeOut();
    }

    return {
        initialize: initialize
    }
};

$(document).ready(() => {
    calcIndex = WeaponCalcIndex();
    calcIndex.initialize();
});