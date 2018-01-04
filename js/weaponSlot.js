const WEAPON_SLOT_PREFIX = 'weapon-slot-';
const WEAPON_SLOT_STAT_GRID_PREFIX = "stat-grid-";

const CSS_CLASS = {
    GRID: 'weapon-stat',
    EDITABLE: 'editable'
}

const GRID_STAT_METADATA = [
    { name: 'headerCol', label: ' ', datatype: 'string', editable: false },
    { name: 'hp', label: 'HP', datatype: 'integer', editable: true },
    { name: 'atk', label: 'ATTACK', datatype: 'integer', editable: true },
    { name: 'brk', label: 'BREAK', datatype: 'integer', editable: true },
    { name: 'mag', label: 'MAGIC', datatype: 'integer', editable: true },
    { name: 'crit', label: 'CRITICAL', datatype: 'integer', editable: true },
    { name: 'spd', label: 'SPEED', datatype: 'integer', editable: true },
    { name: 'def', label: 'DEFENSE', datatype: 'integer', editable: true },
    { name: 'modDone', label: 'MODS DONE', datatype: 'integer', editable: false },
    { name: 'modAllowed', label: 'MODS UNLOCKED', datatype: 'integer', editable: false },
    { name: 'preset', label: 'PRESETS', datatype: 'string', editable: false }
];

const EXTRA_COL = 3;
const STAT_FACTOR = { hp: 10, atk: 1, brk: 1, mag: 1 };
const STAT_STEP = 2;

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

const ATTR_PRESET = 'data-preset';
const ATTR_ROW_IDX = 'data-row-id';

const PRESET_BASE_STAT = 'preset-base';
const PRESET_MIN_STAT = 'preset-min';
const PRESET_MAX_STAT = 'preset-max';

const MSG = {
    STAT_UNEVEN: "Unable to reach this value with a base stat of ",
    LOWERBOUND_EXCEEDED: "Value must not be lower than base stat of ",
    UPPERBOUND_EXCEEDED: "Value must not be higher than max stat of ",
    IS_NAN: "Value must be an integer.",
    INVALID_MOD_COUNT: "Number of modification done must be 1 less than or equal to number of modification allowed by stat boosting.",
    MINIMUM_MOD_REQUIRED: "Number of modification done must be at least ",
    INVALID_ABILITY_VALUE: "This ability value is not achieveable.",
    MOD_DONE_HINT: "Total number of modifications made given the number of stars & ability levels on the weapon.",
    MOD_ALLOWED_HINT: "Total number of modifications allowed given the number of stat boosts made on the weapon. Total modification done must not exceed this value.",
}

/**
 * 
 * @param {Object} config - db, weaponId, initialStats, userOptions
 * @param {jQueryObject} parentContainer
 */
const WeaponSlot = function (config, parentContainer) {

    var db = config.db;
    var weaponData = db.weapon[config.weaponId];
    var calc = WeaponBoostCalculator(config);
    var editableGrid = new EditableGrid(config.weaponId, { enableSort: false });
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
    var $resultTimeCostNatural = $container.find('.time-cost-natural');
    var $resultElixirCost = $container.find('.elixir-cost');
    var $weaponName = $container.find('.weapon-slot-name label').text(weaponData.name);
    var $weaponThumbs = $container.find('.weapon-slot-name img').attr('src', weaponData.thumbnailUrl);
    var $weaponMaxModCount = $container.find('.weapon-mod-count span').text(calc.totalBoostModCounts.totalModCount);
    var $presetTemplate = $('#preset-template .dropdown');
    var $removeButton = $container.find('button.btn-close');
    var $notificationLabel = $container.find('.weapon-slot-notification label');

    var flattenStatData = function (stat) {
        var values = {};
        for (var type in stat.boost) {
            values[type] = stat.boost[type] * STAT_FACTOR[type];
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
        var validity = calc.checkStatValidity(stat);
        values.modDone = validity.modDone;
        values.modAllowed = validity.modAllowed;
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
                newStat.boost[type] = values[type] / STAT_FACTOR[type];
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
            min: calc.baseStat.boost[type] * STAT_FACTOR[type],
            max: calc.maxStat.boost[type] * STAT_FACTOR[type],
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

    var applyPreset = function () {
        var rowIndex = $(this).attr(ATTR_ROW_IDX);
        var preset = $(this).attr(ATTR_PRESET);
        var values = flattenStatData(statPresets[preset]);
        var validity = calc.checkStatValidity(statPresets[preset]);
        values.modDone = validity.modDone;
        values.modAllowed = validity.modAllowed;

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

    var editableRenderer = new CellRenderer({
        render: function (cell, value) {
            $(cell).addClass(CSS_CLASS.EDITABLE);
            new NumberCellRenderer({
                column: {
                    nansymbol: 'NaN',
                    precision: null,
                    unit: null
                }
            }).render(cell, value);
        }
    })

    var validate = function (condition, msg) {
        if (condition) {
            $notificationLabel.text("");
            return true;
        } else {
            $notificationLabel.text(msg);
            return false;
        }
    }

    var getStatValidator = function (column, constraint) {
        var statStep = STAT_STEP * STAT_FACTOR[column];
        return new CellValidator({
            isValid: function (value) {
                var intValue = parseInt(value);
                if (!validate(!isNaN(intValue), MSG.IS_NAN)) return false;
                if (intValue == constraint.max) return true;
                return validate(intValue >= constraint.min, MSG.LOWERBOUND_EXCEEDED + constraint.min)
                    && validate(intValue < constraint.max, MSG.UPPERBOUND_EXCEEDED + constraint.max)
                    && validate(intValue % statStep == constraint.min % statStep, MSG.STAT_UNEVEN + constraint.min);
            }
        });
    }

    var getModValidator = function (constraint) {
        return new CellValidator({
            isValid: function (value) {
                var intValue = parseInt(value);
                return validate(!isNaN(intValue), MSG.IS_NAN)
                    && validate(intValue >= constraint.min, MSG.LOWERBOUND_EXCEEDED + constraint.min)
                    && validate(intValue <= constraint.max, MSG.UPPERBOUND_EXCEEDED + constraint.max);
            }
        });
    }

    var getAbilityValidator = function (constraint) {
        return new CellValidator({
            isValid: function (value) {
                var intValue = parseInt(value);
                return validate(!isNaN(intValue), MSG.IS_NAN)
                    && validate(constraint[intValue], MSG.INVALID_ABILITY_VALUE);
            }
        })
    }

    var updateBoostCost = function (userOptions) {
        if (!userOptions)
            userOptions = config.userOptions;

        var currentInput = getStatData();
        var boostTimeInHours = Math.max(0, calc.computeTotalTime(currentInput[0], currentInput[1]));
        var boostTimeInDays = (boostTimeInHours / 24).toFixed(1);
        var boostTimeNatural = (boostTimeInHours * 60 / (24 * 60 + userOptions.dailyStamina * userOptions.staminaMultiplier)).toFixed(1);
        $resultTimeCost.text(boostTimeInHours + ' hour(s) | ' + boostTimeInDays + ' day(s)');
        $resultTimeCostNatural.text(boostTimeNatural + ' day(s)');
        $resultElixirCost.text(
            Math.ceil(boostTimeInHours * 60 / ((userOptions.staminaLevel + userOptions.bonusStamina) * userOptions.staminaMultiplier))
            + ' elixir(s)');
    }

    var onGridValueChange = function (rowIndex, columnIndex, oldValue, newValue, row) {
        var currentInput = getStatData();
        var statValidity = calc.checkStatValidity(currentInput[rowIndex]);
        editableGrid.setValueAt(rowIndex, metadata.length - EXTRA_COL, statValidity.modDone);
        editableGrid.setValueAt(rowIndex, metadata.length - EXTRA_COL + 1, statValidity.modAllowed);
        if (!statValidity.isValid) {
            if (statValidity.allBoostDone)
                $notificationLabel.text(MSG.MINIMUM_MOD_REQUIRED + statValidity.modAllowed);
            else
                $notificationLabel.text(MSG.INVALID_MOD_COUNT);
        } else {
            $notificationLabel.text("");
            updateBoostCost();
        }
    }

    var generateConstraintHint = function (columnName) {
        if (boostConstraints[columnName])
            return "<b>Base value:</b> " + boostConstraints[columnName].min + '<br/> <b>Max value:</b> ' + boostConstraints[columnName].max;
        if (modConstraints[columnName])
            return "<b>Base value:</b> " + modConstraints[columnName].min + '<br/> <b>Max value:</b> ' + modConstraints[columnName].max;
        if (abilityConstraints[columnName]) {
            possibleValues = [];
            for (var key in abilityConstraints[columnName])
                possibleValues.push(key);
            return "<b>Possible values:</b> <br/>" + possibleValues.join(' ');
        }
    }

    var onEditorOpen = function (rowIndex, columnIndex) {
        var cell = editableGrid.getCell(rowIndex, columnIndex);
        var $input = $(cell).children('input');
        $input.popover({
            trigger: 'focus',
            placement: 'right',
            container: 'body',
            html: true,
            content: generateConstraintHint(editableGrid.getColumnName(columnIndex))
        })
    };

    var renderWeaponSlot = function () {
        editableGrid.load({ 'metadata': metadata, 'data': data });
        editableGrid.setCellRenderer('preset', presetRenderer);
        for (var type in boostConstraints) {
            editableGrid.setCellRenderer(type, editableRenderer);
            editableGrid.addCellValidator(type, getStatValidator(type, boostConstraints[type]));
        }
        for (var type in modConstraints) {
            editableGrid.setCellRenderer(type, editableRenderer);
            editableGrid.addCellValidator(type, getModValidator(modConstraints[type]));
        }
        for (var type in abilityConstraints) {
            editableGrid.setCellRenderer(type, editableRenderer);
            editableGrid.addCellValidator(type, getAbilityValidator(abilityConstraints[type]));
        }
        editableGrid.renderGrid($gridContainer.attr('id'), CSS_CLASS.GRID);
        editableGrid.modelChanged = onGridValueChange;
        editableGrid.openedCellEditor = onEditorOpen;

        // hack this first
        $container.find('.editablegrid-modDone').popover({
            trigger: 'hover',
            placement: 'top',
            container: 'body',
            content: MSG.MOD_DONE_HINT
        });
        $container.find('.editablegrid-modAllowed').popover({
            trigger: 'hover',
            placement: 'top',
            container: 'body',
            content: MSG.MOD_ALLOWED_HINT
        });

        updateBoostCost();
    }

    return {
        weaponId: config.weaponId,
        render: renderWeaponSlot,
        updateBoostCost: updateBoostCost,
        $element: $container,
        $removeButton: $removeButton
    }
}