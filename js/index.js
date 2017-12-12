const WeaponCalcIndex = function () {

    var db, calc;

    var initialize = function () {
        $.getJSON('js/db.json', data => {
            WeaponBoostDB(data).then((loadedDB) => {
                db = loadedDB;
                calc = WeaponBoostCalculator(loadedDB);
                initializeComponents();
                bindComponents();
            });
        });
    };

    var initializeComponents = function () {

    };

    var bindComponents = function () {

    };

    var test = function () {
        startingStat    = WeaponStat(0, 100, 75, 30, 1, 1, 3, 1, 1, 0, 0);
        // finalStat       = WeaponStat(0, 100, 75, 30, 1, 1, 3, 1, 1, 0, 0);
        finalStat = calc.computeMaximumMod('buster_sword');
        console.log(finalStat);
        return calc.computeBoostTime('buster_sword', startingStat, finalStat);
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