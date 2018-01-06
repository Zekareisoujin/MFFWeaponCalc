/* exported WeaponStat */
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
  };
};