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

const WeaponBoostCalculator = function (db, weaponId) {

    var weaponData = db.weapon[weaponId];
    var totalBoostCount = 0;
    var totalModCount = 0;

    var maxAbilityRank = {};
    var abilityModCount = {};
    for (var abilityId in weaponData.abilityRanks) {
        maxAbilityRank[abilityId] =  db.ability[abilityId].stepCounts + 1;
        abilityModCount[abilityId] = maxAbilityRank[abilityId] - weaponData.abilityRanks[abilityId];
        totalModCount += abilityModCount[abilityId];
    }

    var weaponMaxStat = WeaponStat(MAX_STAT, MAX_STAT, MAX_STAT, MAX_STAT, 5, 2, 5, maxAbilityRank);
    var weaponBaseStat = WeaponStat(weaponData.hp, weaponData.attack, weaponData.break, weaponData.magic,
        weaponData.critical, weaponData.speed, weaponData.defense, weaponData.abilityRanks);


    var statBoostCount = {};
    for (var stat in weaponMaxStat.boost) {
        var finalStat = weaponMaxStat.boost[stat];
        var startingStat = weaponBaseStat.boost[stat];
        
        if (startingStat % 2 == 1)
            startingStat--;

        statBoostCount[stat] = (finalStat - startingStat) / 2;
        totalBoostCount += statBoostCount[stat];
    }

    var statModCount = {};
    for (var stat in weaponMaxStat.mod) {
        statModCount[stat] = weaponMaxStat.mod[stat] - weaponBaseStat.mod[stat];
        totalModCount += statModCount[stat];
    }

    var weaponMinStat;
    if (totalBoostCount < totalModCount * BOOST_PER_MOD)
        weaponMinStat = weaponMaxStat;
    else {
        var boostRequired = totalModCount * BOOST_PER_MOD;
        var minBoostStat = [];
        for (var stat in weaponBaseStat.boost){
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

    return {
        computeTotalTime: computeTotalTime,
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