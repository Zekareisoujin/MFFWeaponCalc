const WeaponCalcIndex = function () {

    var db;
    var weaponBoostSlots = {};
    var $weaponSearch, $weaponSelect, $weaponAdd, $weaponBoostArea;
    var $weaponSelectOptions = {};

    var initialize = function () {
        $.getJSON('js/db.json', data => {
            WeaponBoostDB(data).then((loadedDB) => {
                db = loadedDB;
                initializeComponents();
                bindComponents();
                // test();
            });
        });
    };

    var initializeComponents = function () {
        $weaponSelect = $('#weapon-select');
        $weaponSearch = $('#weapon-search');
        $weaponAdd = $('#weapon-add');
        $weaponBoostArea = $('#weapon-boost-area');

        for (var weaponId in db.weapon) {
            var weaponData = db.weapon[weaponId];
            $weaponSelectOptions[weaponId] = $('<option>').text(weaponData.name).val(weaponId);
            $weaponSelect.append($weaponSelectOptions[weaponId]);
        }
    };

    var bindComponents = function () {
        $weaponAdd.click(addWeaponToBoostArea);
        $weaponSearch.on('input', filterSelectList);
    };

    var addWeaponToBoostArea = function (e) {
        var weaponId = $weaponSelect.val();
        if (weaponId) {
            $weaponSelect.find('option:selected').prop('disabled', true);
            weaponSlot = WeaponSlot({
                db: db,
                weaponId: weaponId,
                userOptions: {
                    staminaLevel: 100,
                    staminaMultiplier: 3
                }
            }, $weaponBoostArea);
            weaponSlot.render();
            weaponBoostSlots[weaponId] = weaponSlot;
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

    var test = function () {
        var calc = WeaponBoostCalculator({ db: db, weaponId: 'buster_sword' });
        console.log(calc);
    };

    return {
        initialize: initialize,
        test: test
    }
};

$(document).ready(() => {
    calcIndex = WeaponCalcIndex();
    calcIndex.initialize();
});