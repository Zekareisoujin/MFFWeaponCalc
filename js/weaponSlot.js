const WEAPON_SLOT_PREFIX = 'weapon-slot-';
const WEAPON_SLOT_STAT_GRID_PREFIX = "stat-grid-";

const GRID_CSS_CLASS = 'weapon-stat';
const GRID_STAT_METADATA = [
    { name: 'headerCol', label: ' ', datatype: 'string', editable: false },
    { name: 'hp', label: 'HP', datatype: 'integer', editable: true },
    { name: 'atk', label: 'ATTACK', datatype: 'integer', editable: true },
    { name: 'brk', label: 'BREAK', datatype: 'integer', editable: true },
    { name: 'mag', label: 'MAGIC', datatype: 'integer', editable: true },
    { name: 'crit', label: 'CRITICAL', datatype: 'integer', editable: true },
    { name: 'spd', label: 'SPEED', datatype: 'integer', editable: true },
    { name: 'def', label: 'DEFENSE', datatype: 'integer', editable: true },
    { name: 'availableMod', label: 'AVAILALBE MODS', datatype: 'integer', editable: false },
    { name: 'preset', label: 'PRESETS', datatype: 'string', editable: false }
];

const EXTRA_COL = 2;

const STARTING_VALUE_ROW = {
    id: 'starting_values',
    label: 'STARTING VALUES',
    rowId: 0
};
const FINAL_VALUE_ROW = {
    id: 'final_values',
    label: 'DESIRED VALUES',
    rowId: 1
};

const ATTR_PRESET = 'preset';
const ATTR_ROW_IDX = 'rowIdx';

const PRESET_BASE_STAT = 'preset-base';
const PRESET_MIN_STAT = 'preset-min';
const PRESET_MAX_STAT = 'preset-max';

/**
 * 
 * @param {Object} config - db, weaponId, initialStats, userOptions
 * @param {jQueryObject} parentContainer
 */
const WeaponSlot = function (config, parentContainer) {

    var db = config.db;
    var weaponData = db.weapon[config.weaponId];
    var calc = WeaponBoostCalculator(config);
    var editableGrid = new EditableGrid(config.weaponId);
    var abilityList = {};
    for (var type in calc.baseStat.ability) {
        abilityList[type] = {};
        for (var typeData in db.ability[type])
            abilityList[type][typeData] = db.ability[type][typeData];
        abilityList[type].requireUnlock = calc.baseStat.ability[type] == 0;
    }
    var statPresets = {
        [PRESET_BASE_STAT]: calc.baseStat,
        [PRESET_MIN_STAT]: calc.minStat,
        [PRESET_MAX_STAT]: calc.maxStat
    }

    var $container = $('#weapon-slot-template').clone()
        .attr('id', WEAPON_SLOT_PREFIX + config.weaponId)
        .removeClass('hidden')
        .appendTo(parentContainer);
    var $gridContainer = $container.find('.stat-calc-input').attr('id', WEAPON_SLOT_STAT_GRID_PREFIX + config.weaponId);
    var $resultTimeCost = $container.find('.time-cost');
    var $resultElixirCost = $container.find('.elixir-cost');
    var $weaponName = $container.find('.weapon-slot-name').text(weaponData.name);
    var $weaponThumbs = $container.find('img').attr('src', weaponData.thumbnailUrl);
    var $presetTemplate = $('#preset-template .dropdown');

    var flattenStatData = function (stat) {
        var values = {};
        for (var type in stat.boost) {
            values[type] = stat.boost[type];
        }
        for (var type in stat.mod) {
            values[type] = stat.mod[type];
        }
        for (var type in stat.ability) {
            if (stat.ability[type] == 0)
                values[type] = 0;
            else
                values[type] = (stat.ability[type] - 1) * abilityList[type].step + abilityList[type].startingValue;
        }
        return values;
    }

    var convertToGridData = function (rowEnum, stat) {
        var values = flattenStatData(stat);
        values.headerCol = rowEnum.label;
        values.availableMod = calc.checkStatValidity(stat).availableMod;
        values.preset = rowEnum.rowId;
        
        return {
            id: rowEnum.id,
            values: values
        };
    }

    var getStatData = function () {
        var statData = [];
        for (var i = 0; i < 2; i++) {
            var newStat = WeaponStat();
            var values = editableGrid.getRowValues(i);
            for (var type in newStat.boost) {
                newStat.boost[type] = values[type];
            }
            for (var type in newStat.mod) {
                newStat.mod[type] = values[type];
            }
            newStat.ability = {};
            for (var type in abilityList) {
                if (values[type] == 0)
                    newStat.ability[type] = 0;
                else if (abilityList[type].startingValue == abilityList[type].finalValue)
                    newStat.ability[type] = 1;
                else
                    newStat.ability[type] = (values[type] - abilityList[type].startingValue) / abilityList[type].step + 1;
            }
            statData.push(newStat);
        }
        return statData;
    }

    var metadata = GRID_STAT_METADATA.slice();
    for (var abilityId in weaponData.abilityRanks) {
        var abilityData = db.ability[abilityId];
        metadata.splice(metadata.length - EXTRA_COL, 0, {
            name: abilityData.id,
            label: abilityData.name.toUpperCase(),
            datatype: 'integer',
            editable: true
        });
    }

    var data = [];
    if (config.initialStats) {
        data.push(convertToGridData(STARTING_VALUE_ROW, config.initialStats[0]));
        data.push(convertToGridData(FINAL_VALUE_ROW, config.initialStats[1]));
    } else {
        data.push(convertToGridData(STARTING_VALUE_ROW, calc.baseStat));
        data.push(convertToGridData(FINAL_VALUE_ROW, calc.maxStat));
    }

    var boostConstraints = {};
    for (var type in calc.baseStat.boost) {
        boostConstraints[type] = {
            min: calc.baseStat.boost[type],
            max: calc.maxStat.boost[type],
        }
    }
    var modConstraints = {};
    for (var type in calc.baseStat.mod) {
        modConstraints[type] = {
            min: calc.baseStat.mod[type],
            max: calc.maxStat.mod[type]
        }
    }
    var abilityConstraints = {};
    for (var abilityId in abilityList) {
        abilityConstraints[abilityId] = {};
        var abilityData = abilityList[abilityId];
        if (abilityData.requireUnlock)
            abilityConstraints[abilityId][0] = true;
        if (abilityData.startingValue == abilityData.finalValue)
            abilityConstraints[abilityId][abilityData.startingValue] = true;
        else
            for (var i = abilityData.startingValue; i <= abilityData.finalValue; i += abilityData.step)
                abilityConstraints[abilityId][i] = true;
    }

    var updateBoostCost = function (userOptions) {
        if (!userOptions)
            userOptions = config.userOptions;

        var currentInput = getStatData();
        var boostTimeInHours = Math.max(0, calc.computeTotalTime(currentInput[0], currentInput[1]));
        var boostTimeInDays = (boostTimeInHours / 24).toFixed(1);
        $resultTimeCost.html(boostTimeInHours + ' hour(s) | ' + boostTimeInDays + ' day(s)');
        $resultElixirCost.html(
            Math.ceil(boostTimeInHours * 60 / userOptions.staminaLevel * userOptions.staminaMultiplier)
            + ' (tentative number)');
    }

    var onGridValueChange = function (rowIndex, columnIndex, oldValue, newValue, row) {
        var currentInput = getStatData();
        var statValidity = calc.checkStatValidity(currentInput[rowIndex]);
        editableGrid.setValueAt(rowIndex, metadata.length - EXTRA_COL, statValidity.availableMod);
        // if (statValidity.isValid)
        updateBoostCost();
    }

    var hpValueRenderer = new CellRenderer({
        render: function (cell, value) {
            var intValue = parseInt(value);
            if (!isNaN(intValue))
                $(cell).text(intValue * 10);
        }
    })

    var applyPreset = function () {
        var rowIndex = $(this).attr(ATTR_ROW_IDX);
        var preset = $(this).attr(ATTR_PRESET);
        console.log(preset);
        console.log(statPresets);
        var values = flattenStatData(statPresets[preset]);
        for (var type in values) {
            editableGrid.setValueAt(rowIndex, editableGrid.getColumnIndex(type), values[type]);
        }
        updateBoostCost();
    }

    var presetRenderer = new CellRenderer({
        render: function (cell, value) {
            var $presetDropdown = $presetTemplate.clone().appendTo($(cell));
            $presetDropdown.find('a').attr(ATTR_ROW_IDX, value).click(applyPreset);
        }
    })

    var getStatValidator = function (constraint) {
        return new CellValidator({
            isValid: function (value) {
                var intValue = parseInt(value);
                if (isNaN(intValue)) return false;
                if (intValue == constraint.max) return true;
                return intValue >= constraint.min && intValue < constraint.max && intValue % 2 == constraint.min % 2;
            }
        });
    }

    var getModValidator = function (constraint) {
        return new CellValidator({
            isValid: function (value) {
                var intValue = parseInt(value);
                return !isNaN(intValue) && intValue >= constraint.min && intValue <= constraint.max;
            }
        });
    }

    var getAbilityValidator = function (constraint) {
        return new CellValidator({
            isValid: function (value) {
                var intValue = parseInt(value);
                return !isNaN(intValue) && constraint[intValue] != undefined && constraint[intValue];
            }
        })
    }

    var renderWeaponSlot = function () {
        editableGrid.load({ 'metadata': metadata, 'data': data });
        editableGrid.setCellRenderer('hp', hpValueRenderer);
        editableGrid.setCellRenderer('preset', presetRenderer);
        for (var type in boostConstraints)
            editableGrid.addCellValidator(type, getStatValidator(boostConstraints[type]));
        for (var type in modConstraints)
            editableGrid.addCellValidator(type, getModValidator(modConstraints[type]));
        for (var type in abilityConstraints)
            editableGrid.addCellValidator(type, getAbilityValidator(abilityConstraints[type]));
        editableGrid.renderGrid($gridContainer.attr('id'), GRID_CSS_CLASS);
        editableGrid.modelChanged = onGridValueChange;
        updateBoostCost();
    }

    return {
        weaponId: config.weaponId,
        render: renderWeaponSlot,
        updateBoostCost: updateBoostCost
    }
}