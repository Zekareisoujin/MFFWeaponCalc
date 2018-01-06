/* exported WeaponBoostCalculator */
/* global WeaponStat */
const WeaponBoostCalculator = function (weaponData) {

  const MOD_TIME = 24,
    MAX_STAT = 200,
    BOOST_PER_MOD = 6;

  var _wData = weaponData,
    _wBaseStat, _wMaxStat, _wMinStat,
    _statBoostCount, _statModCount, _abilityModCount,
    _totalBoostCount, _totalModCount;

  function _init() {
    var maxAbilityRank = {};
    for (var aId in _wData.abilities) {
      maxAbilityRank[aId] =
        _wData.abilities[aId].stepCounts + 1;
    }

    var allAbilityModCount =
      _computeAbilityModCount(_wData.startingRanks, maxAbilityRank);
    _abilityModCount = allAbilityModCount.abilityModCount;
    _totalModCount = allAbilityModCount.totalAbilityModCount;

    _wMaxStat =
      WeaponStat(MAX_STAT, MAX_STAT, MAX_STAT, MAX_STAT,
        5, 2, 5, maxAbilityRank);
    _wBaseStat = WeaponStat(_wData.hp, _wData.attack,
      _wData.break, _wData.magic,
      _wData.critical, _wData.speed, _wData.defense,
      _wData.startingRanks);

    var allBoostCount = _computeBoostCount(_wBaseStat, _wMaxStat);
    _statBoostCount = allBoostCount.statBoostCount;
    _totalBoostCount = allBoostCount.totalBoostCount;

    var allStatModCount = _computeStatModCount(_wBaseStat, _wMaxStat);
    _statModCount = allStatModCount.statModCount;
    _totalModCount += allStatModCount.totalStatModCount;

    if (_totalBoostCount < _totalModCount * BOOST_PER_MOD)
      _wMinStat = _wMaxStat;
    else {
      var boostRequired = _totalModCount * BOOST_PER_MOD;
      var minBoostStat = [];
      for (var sId in _wBaseStat.boost) {
        minBoostStat.push({
          stat: sId,
          value: _wBaseStat.boost[sId]
        });
      }

      // brute forcing...
      while (boostRequired > 0) {
        minBoostStat.sort((a, b) => {
          return a.value - b.value;
        });
        minBoostStat[0].value += 2;
        boostRequired--;
      }

      _wMinStat = WeaponStat(0, 0, 0, 0, 5, 2, 5, _wMaxStat.ability);
      minBoostStat.forEach(element => {
        _wMinStat.boost[element.stat] = element.value;
      });
    }
  }

  function _computeBoostCount(startingStat, finalStat) {
    var count = {};
    var total = 0;
    for (var sId in startingStat.boost) {
      var startingValue = startingStat.boost[sId];
      var finalValue = finalStat.boost[sId];
      if (startingValue % 2 == 1)
        startingValue--;

      count[sId] = Math.floor((finalValue - startingValue) / 2);
      total += count[sId];
    }
    return {
      statBoostCount: count,
      totalBoostCount: total
    };
  }

  function _computeStatModCount(startingStat, finalStat) {
    var count = {};
    var total = 0;
    for (var sId in startingStat.mod) {
      count[sId] = finalStat.mod[sId] - startingStat.mod[sId];
      total += count[sId];
    }
    return {
      statModCount: count,
      totalStatModCount: total
    };
  }

  function _computeAbilityModCount(startingRanks, finalRanks) {
    var count = {};
    var total = 0;
    for (var aId in startingRanks) {
      count[aId] = finalRanks[aId] - startingRanks[aId];
      total += count[aId];
    }
    return {
      abilityModCount: count,
      totalAbilityModCount: total
    };
  }

  function _computeBoostTime(startingStat, finalStat) {
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

    return (finalBoostTime + startingBoostTime) *
      stepCount / 2 + finalStepBoostTime;
  };

  function _computeModTime(startingStat, finalStat) {
    return MOD_TIME * (finalStat - startingStat);
  };

  function _computeTotalTime(startingStats, finalStats) {
    var totalTime = 0;
    for (var sId in startingStats.boost) {
      totalTime += _computeBoostTime(
        startingStats.boost[sId],
        finalStats.boost[sId]);
    }

    for (var sId in startingStats.mod) {
      totalTime += _computeModTime(
        startingStats.mod[sId], finalStats.mod[sId]);
    }

    for (var aId in startingStats.ability) {
      totalTime += _computeModTime(
        startingStats.ability[aId], finalStats.ability[aId]);
    }

    return totalTime;
  };

  function _checkStatValidity(currentStats) {
    var boostDone = _computeBoostCount(_wBaseStat, currentStats)
      .totalBoostCount;
    var modDone = _computeStatModCount(_wBaseStat, currentStats)
      .totalStatModCount +
      _computeAbilityModCount(_wBaseStat.ability, currentStats.ability)
      .totalAbilityModCount;
    var modAllowed = Math.floor(boostDone / BOOST_PER_MOD);
    var isValid = false;
    var availableMod = 0;

    if (boostDone < _totalBoostCount) {
      availableMod = modAllowed - modDone;
      isValid = (availableMod == 1 || availableMod == 0);
    } else {
      availableMod = _totalModCount - modDone;
      isValid = (modDone >= modAllowed);
    }

    return {
      isValid: isValid,
      availableMod: availableMod,
      modAllowed: modAllowed,
      modDone: modDone,
      allBoostDone: boostDone >= _totalBoostCount
    };
  };

  _init();
  return {
    /* property */
    weaponId: _wData.id,
    baseStat: _wBaseStat,
    maxStat: _wMaxStat,
    minStat: _wMinStat,
    totalBoostModCounts: {
      statBoost: _statBoostCount,
      statMod: _statModCount,
      abilityMod: _abilityModCount,
      totalBoostCount: _totalBoostCount,
      totalModCount: _totalModCount
    },

    /* method */
    computeTotalTime: _computeTotalTime,
    checkStatValidity: _checkStatValidity
  };
};