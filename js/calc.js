const WeaponStat = function (hp, atk, brk, mag, crit, spd, def, abilityRank_arr) {
    return {
        boost: {
            hp: hp,
            atk: atk,
            brk: brk,
            mag: mag
        },

        mod: {
            crit: crit,
            spd: spd,
            def: def,
        },

        ability: abilityRank_arr
    }
}

const WeaponBoostCalculator = function (db) {

    const MOD_TIME = 24;
    const MAX_STAT = 200;

    var computeBoostTime = function (startingStat, finalStat) {
        var realStartingStep = startingStat + 2;
        var realFinalStat = finalStat;
        var finalStepBoostTime = 0;

        if (finalStat == MAX_STAT && startingStat % 2 == 1) {
            realFinalStat = MAX_STAT - 1;
            finalStepBoostTime = MAX_STAT / 2;
        }

        if (realStartingStep > realFinalStat)
            return 0;

        var startingBoostTime = realStartingStep / 2;
        var finalBoostTime = realFinalStat / 2;
        var stepCount = (realFinalStat - realStartingStep) / 2 + 1;
        return (finalBoostTime + startingBoostTime) * stepCount / 2 + finalStepBoostTime;
    };

    var computeModTime = function (startingStat, finalStat) {
        return MOD_TIME * (finalStat - startingStat);
    };

    var computeTotalTime = function (weaponId, startingStats, finalStats) {
        var totalTime = 0;
        for (var weaponBoostStat in startingStats.boost) {
            totalTime += computeBoostTime(startingStats.boost[weaponBoostStat], finalStats.boost[weaponBoostStat]);
        }

        for (var weaponModStat in startingStats.mod) {
            totalTime += computeModTime(startingStats.mod[weaponModStat], finalStats.mod[weaponModStat]);
        }

        for (var i = 0; i < startingStats.ability.length; i++) {
            totalTime += computeModTime(startingStats.ability[i], finalStats.ability[i]);
        }

        return totalTime;
    };

    var computeMinimumBoostStat = function (weaponId, weaponStat) {

    };

    var computeMaximumBoostStat = function (weaponId) {
        var maxWeaponRank = [];
        var abilityList = db.weapon[weaponId].ability;
        abilityList.forEach(element => {
            maxWeaponRank.push(db.ability[element.id].stepCounts + 1);
        });
        return WeaponStat(MAX_STAT, MAX_STAT, MAX_STAT, MAX_STAT, 5, 2, 5, maxWeaponRank);
    };

    return {
        computeBoostTime: computeTotalTime,
        computeMinimumMod: computeMinimumBoostStat,
        computeMaximumMod: computeMaximumBoostStat
    };
};