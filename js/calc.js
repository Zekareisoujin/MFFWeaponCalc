const MOD_TIME = 24;
const MAX_STAT = 200;
const BOOST_PER_MOD = 6;

const WeaponStat = function (hp, atk, brk, mag, crit, spd, def, abilityRanks) {
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

        ability: abilityRanks
    }
}

/**
 * 
 * @param {Object} config - db, weaponId
 */
const WeaponBoostCalculator = function (config) {

    var db = config.db;
    var weaponData = db.weapon[config.weaponId];

    var computeBoostCount = function (startingStat, finalStat) {
        var statBoostCount = {};
        var totalBoostCount = 0;
        for (var stat in startingStat.boost) {
            var startingValue = startingStat.boost[stat];
            var finalValue = finalStat.boost[stat];
            if (startingValue % 2 == 1)
                startingValue--;

            statBoostCount[stat] = Math.floor((finalValue - startingValue) / 2);
            totalBoostCount += statBoostCount[stat];
        }
        return {
            statBoostCount: statBoostCount,
            totalBoostCount: totalBoostCount
        }
    }

    var computeStatModCount = function (startingStat, finalStat) {
        var totalStatModCount = 0;
        var statModCount = {};
        for (var stat in startingStat.mod) {
            statModCount[stat] = finalStat.mod[stat] - startingStat.mod[stat];
            totalStatModCount += statModCount[stat];
        }
        return {
            statModCount: statModCount,
            totalStatModCount: totalStatModCount
        }
    }

    var computeAbilityModCount = function (startingRanks, finalRanks) {
        var abilityModCount = {};
        var totalAbilityModCount = 0;
        for (var abilityId in startingRanks) {
            abilityModCount[abilityId] = finalRanks[abilityId] - startingRanks[abilityId];
            totalAbilityModCount += abilityModCount[abilityId];
        }
        return {
            abilityModCount: abilityModCount,
            totalAbilityModCount: totalAbilityModCount
        }
    }

    var maxAbilityRank = {};
    for (var abilityId in weaponData.abilityRanks) {
        maxAbilityRank[abilityId] = db.ability[abilityId].stepCounts + 1;
    }

    var allAbilityModCount = computeAbilityModCount(weaponData.abilityRanks, maxAbilityRank);
    var abilityModCount = allAbilityModCount.abilityModCount;
    var totalModCount = allAbilityModCount.totalAbilityModCount;

    var weaponMaxStat = WeaponStat(MAX_STAT, MAX_STAT, MAX_STAT, MAX_STAT, 5, 2, 5, maxAbilityRank);
    var weaponBaseStat = WeaponStat(weaponData.hp, weaponData.attack, weaponData.break, weaponData.magic,
        weaponData.critical, weaponData.speed, weaponData.defense, weaponData.abilityRanks);

    var allBoostCount = computeBoostCount(weaponBaseStat, weaponMaxStat);
    var statBoostCount = allBoostCount.statBoostCount;
    var totalBoostCount = allBoostCount.totalBoostCount;

    var allStatModCount = computeStatModCount(weaponBaseStat, weaponMaxStat);
    var statModCount = allStatModCount.statModCount;
    totalModCount += allStatModCount.totalStatModCount;

    var weaponMinStat;
    if (totalBoostCount < totalModCount * BOOST_PER_MOD)
        weaponMinStat = weaponMaxStat;
    else {
        var boostRequired = totalModCount * BOOST_PER_MOD;
        var minBoostStat = [];
        for (var stat in weaponBaseStat.boost) {
            minBoostStat.push({
                stat: stat,
                value: weaponBaseStat.boost[stat]
            });
        }

        // don't look at me...
        while (boostRequired > 0) {
            minBoostStat.sort((a, b) => {
                return a.value - b.value;
            });
            minBoostStat[0].value += 2;
            boostRequired--;
        }

        weaponMinStat = WeaponStat(0, 0, 0, 0, 5, 2, 5, weaponMaxStat.ability);
        minBoostStat.forEach(element => {
            weaponMinStat.boost[element.stat] = element.value;
        })
    }



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

    var computeTotalTime = function (startingStats, finalStats) {
        var totalTime = 0;
        for (var weaponBoostStat in startingStats.boost) {
            totalTime += computeBoostTime(startingStats.boost[weaponBoostStat], finalStats.boost[weaponBoostStat]);
        }

        for (var weaponModStat in startingStats.mod) {
            totalTime += computeModTime(startingStats.mod[weaponModStat], finalStats.mod[weaponModStat]);
        }

        for (var abilityId in startingStats.ability) {
            totalTime += computeModTime(startingStats.ability[abilityId], finalStats.ability[abilityId]);
        }

        return totalTime;
    };

    var checkStatValidity = function (currentStats) {
        var boostDone = computeBoostCount(weaponBaseStat, currentStats).totalBoostCount;
        var modDone = computeStatModCount(weaponBaseStat, currentStats).totalStatModCount
            + computeAbilityModCount(weaponBaseStat.ability, currentStats.ability).totalAbilityModCount;
        var allowedMod = Math.floor(boostDone / BOOST_PER_MOD);
        var isValid = false;
        var availableMod = 0;

        if (boostDone < totalBoostCount) {
            availableMod = allowedMod - modDone;
            isValid = (availableMod == 1 || availableMod == 0);
        } else {
            availableMod = totalModCount - modDone;
            isValid = (modDone >= allowedMod);
        }

        return {
            isValid: isValid,
            availableMod: availableMod
        }
    }

    return {
        computeTotalTime: computeTotalTime,
        checkStatValidity: checkStatValidity,
        baseStat: weaponBaseStat,
        maxStat: weaponMaxStat,
        minStat: weaponMinStat,
        totalBoostModCounts: {
            statBoost: statBoostCount,
            statMod: statModCount,
            abilityMod: abilityModCount,
            totalBoostCount: totalBoostCount,
            totalModCount: totalModCount
        }
    };
};