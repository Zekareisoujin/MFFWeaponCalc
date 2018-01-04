const NATURAL_STAMINA = 12 * 24;
const MOBIUS_DAY_BONUS = 1; // 100% more stamina
const BAHAMUT_LAGOON_MULTIPLER = 1.5;
const BASE_MULTIPLIER = 3;

const OPTION_NATURAL_STAMINA_SP = 'natural-sp-stam';
const OPTION_NATURAL_STAMINA_MP = 'natural-mp-stam';
const OPTION_MOBIUS_DAY = 'mobius-day';
const OPTION_BAHAMUT_LAGOON = 'bahamut-lagoon';

const ATTR_CLOSE_ID = 'close-id';

const WeaponCalcIndex = function () {

    var db;
    var weaponBoostSlots = {};
    var $weaponSearch, $weaponSelect, $weaponAdd, $weaponBoostArea;
    var $boostSettings, $staminaInput;
    var $weaponSelectOptions = {};

    var initialize = function () {
        $.getJSON('js/db.json', data => {
            WeaponBoostDB(data).then((loadedDB) => {
                db = loadedDB;
                initializeComponents();
                bindComponents();
            });
        });
    };

    var initializeComponents = function () {
        $weaponSelect = $('#weapon-select');
        $weaponSearch = $('#weapon-search');
        $weaponAdd = $('#weapon-add');
        $weaponBoostArea = $('#weapon-boost-area');
        $boostSettings = $('#boost-settings input[type=checkbox]');
        $staminaInput = $('#boost-settings input[type=number]');
        $otherSettings = $('#other-settings input[type=checkbox]');

        $boostSettings.tooltip();

        for (var weaponId in db.weapon) {
            var weaponData = db.weapon[weaponId];
            $weaponSelectOptions[weaponId] = $('<option>').text(weaponData.name).val(weaponId);
            $weaponSelect.append($weaponSelectOptions[weaponId]);
        }
    };

    var bindComponents = function () {
        $weaponAdd.click(addWeaponToBoostArea);
        $weaponSearch.on('input', filterSelectList);
        $boostSettings.change(settingChange);
        $staminaInput.change(settingChange);
    };

    var addWeaponToBoostArea = function (e) {
        var weaponId = $weaponSelect.val();
        if (weaponId) {
            $weaponSelect.find('option:selected').prop('disabled', true);
            weaponSlot = WeaponSlot({
                db: db,
                weaponId: weaponId,
                userOptions: getBoostSettings()
            }, $weaponBoostArea);
            weaponSlot.render();
            weaponBoostSlots[weaponId] = weaponSlot;
            weaponSlot.$removeButton.attr(ATTR_CLOSE_ID, weaponId).click(removeWeaponSlot);
        }
    }

    var filterSelectList = function (e) {
        var key = $(this).val();
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
        var boostSettings = {};
        $boostSettings.each(function (index, element) {
            boostSettings[$(element).attr('option')] = $(element).prop('checked');
        });
        var staminaLevel = parseInt($staminaInput.val());
        var staminaMultiplier = BASE_MULTIPLIER;
        var bonusStamina = 0;
        var dailyStamina = 0;

        if (boostSettings[OPTION_MOBIUS_DAY])
            bonusStamina += staminaLevel * MOBIUS_DAY_BONUS;
        if (boostSettings[OPTION_BAHAMUT_LAGOON])
            staminaMultiplier *= BAHAMUT_LAGOON_MULTIPLER;
        if (boostSettings[OPTION_NATURAL_STAMINA_MP])
            dailyStamina += NATURAL_STAMINA;
        if (boostSettings[OPTION_NATURAL_STAMINA_MP])
            dailyStamina += NATURAL_STAMINA;

        return {
            staminaLevel: staminaLevel,
            staminaMultiplier: staminaMultiplier,
            bonusStamina: bonusStamina,
            dailyStamina: dailyStamina
        }
    }

    var settingChange = function (e) {
        var boostSettings = getBoostSettings();
        for (var weaponId in weaponBoostSlots) {
            weaponBoostSlots[weaponId].updateBoostCost(boostSettings);
        }
    }

    var removeWeaponSlot = function () {
        var weaponId = $(this).attr(ATTR_CLOSE_ID);
        var $element = weaponBoostSlots[weaponId].$element;
        weaponBoostSlots[weaponId] = {};
        delete weaponBoostSlots[weaponId];
        $element.remove();
        $weaponSelectOptions[weaponId].prop('disabled', false);
    }

    return {
        initialize: initialize
    }
};

$(document).ready(() => {
    calcIndex = WeaponCalcIndex();
    calcIndex.initialize();
});