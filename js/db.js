/* exported WeaponBoostDB */
const WeaponBoostDB = function ([weapon, ability]) {

  function _init() {
    for (var weaponId in weapon) {
      var w = weapon[weaponId];
      w.startingRanks = {
        [w.ability1]: w.startingRank1,
        [w.ability2]: w.startingRank2,
        [w.ability3]: w.startingRank3,
        [w.ability4]: w.startingRank4,
      };
      w.abilities = {};
      for (var abilityId in w.startingRanks) {
        w.abilities[abilityId] = ability[abilityId];
      }
    }

    for (var abilityId in ability) {
      var a = ability[abilityId];
      a.step = (a.stepCounts == 0 ?
        0 :
        (a.finalValue - a.startingValue) / a.stepCounts);
    }
  }

  _init();
  return Promise.resolve({
    weapon: weapon,
    ability: ability
  });
};