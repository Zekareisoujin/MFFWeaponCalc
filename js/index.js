const WeaponCalcIndex = function () {

    var db;

    var initialize = function () {
        $.getJSON('js/db.json', data => {
            WeaponBoostDB(data).then((loadedDB) => {
                db = loadedDB;
                initializeComponents();
                bindComponents();
                initializeData();
                test();
            });
        });
    };

    var initializeComponents = function () {
        for (var weaponId in db.weapon) {
            var weaponData = db.weapon[weaponId];
            $('#weapon-select').append(
                $('<option>').text(weaponData.name).val(weaponId));
        }
    };

    var bindComponents = function () {

    };

    var initializeData = function () {
        weaponSlot = WeaponSlot({
            db: db,
            weaponId: 'buster_sword'
        });
        weaponSlot.render('tablecontent');
    }

    var test = function () {
        var calc = WeaponBoostCalculator({db: db, weaponId: 'buster_sword'});
        console.log(calc);
        // console.log(calc.minStat);
        return calc.computeTotalTime(calc.baseStat, calc.minStat);
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