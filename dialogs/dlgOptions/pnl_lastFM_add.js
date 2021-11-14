
var inpYear = null;
var inpMonth = null;
var inpDay = null;
var inpHour = null;
var inpMinute = null;
var inpMaxPages = null;
var inpOptionDates = [];
var optionDateValues = ['Update Play Counts For All', 'Update Play Counts if Newer', 'Update Play Counts if Not Matching']

const PARAM_OPTION_DATE = 'lastFmImport_paramoptionddate';
const PARAM_START_DATE = 'lastFmImport_paramdate';
const PARAM_MAX_PAGES = 'lastFmImport_maxpages';

function createInput(parent, label, value) {
    var inpWrapper = document.createElement('div');
    var labelEl = document.createElement('label');
    labelEl.innerHTML = _(label);
    inpWrapper.appendChild(labelEl);
    var newInp = document.createElement('input');
    newInp.type = 'text';
    newInp.value = value;
    inpWrapper.appendChild(newInp);
    parent.appendChild(inpWrapper);
    return newInp;
}
function createRadioOptions(parent, optionInputs, options, value) {
    for(var option of options) {
        var inpWrapper = document.createElement('div');
        var labelEl = document.createElement('label');
        labelEl.innerHTML = _(option);
        inpWrapper.appendChild(labelEl);
        var newInp = document.createElement('input');
        newInp.type = 'radio';
        newInp.value = option;
        newInp.name = PARAM_OPTION_DATE;
        if(option === value) {
            newInp.checked = true;
        }
        newInp.addEventListener('click', function() {
            for(optionDateField of inpOptionDates) {
                optionDateField.checked = false;
            }
            this.checked = true;
        });
        inpWrapper.appendChild(newInp);
        parent.appendChild(inpWrapper);
        optionInputs.push(newInp);
    }
}

optionPanels.pnl_Library.subPanels.pnl_lastFM.override({
    load: function($super, sett, pnlDiv) {
        $super(sett, pnlDiv);

        var importOptionsFieldset = document.createElement('fieldset');
        importOptionsFieldset.innerHTML = '<legend>' + _('Last.FM Import Play Counts/Dates') + '</legend>';

        var importOptionsDiv = document.createElement('div');
        importOptionsDiv.className = 'uiRows';

        var importLabelDiv = document.createElement('div');
        importLabelDiv.innerHTML = '<label>' + _('Date Last Retrieved') + '</label>';
        importOptionsDiv.appendChild(importLabelDiv);
        
        var paramDate = new Date(Number.parseInt(app.getValue(PARAM_START_DATE, '946706400000'),10));
        var importEntryDiv = document.createElement('div');
        inpYear = createInput(importEntryDiv, 'Year', ('' + paramDate.getFullYear()));
        inpMonth = createInput(importEntryDiv, 'Month', ('' + (paramDate.getMonth() + 1)));
        inpDay = createInput(importEntryDiv, 'Day', ('' + paramDate.getDate()));
        inpHour = createInput(importEntryDiv, 'Hour', ('' + paramDate.getHours()));
        inpMinute = createInput(importEntryDiv, 'Minute', ('' + paramDate.getMinutes()));
        //var updateBtn = document.createElement('button');
        importOptionsDiv.appendChild(importEntryDiv);
        
        var importMMDateDiv = document.createElement('div');
        var paramOptionDate = app.getValue(PARAM_OPTION_DATE, '');
        createRadioOptions(importMMDateDiv, inpOptionDates,
            optionDateValues, 
            paramOptionDate);
        importOptionsDiv.appendChild(importMMDateDiv);
        
        var importMaxPagesDiv = document.createElement('div');
        var paramMaxPages = app.getValue(PARAM_MAX_PAGES, '100');
        inpMaxPages = createInput(importMaxPagesDiv, 'Max Pages', ('' + paramMaxPages));
        importOptionsDiv.appendChild(importMaxPagesDiv);

        importOptionsFieldset.appendChild(importOptionsDiv);
        pnlDiv.appendChild(importOptionsFieldset);
    },
    save: function($super, sett, pnlDiv) {
        $super(sett, pnlDiv);
        // Save settings
        var year = inpYear !== null ? inpYear.value : '2000';
        var month = 0;
        if(inpMonth !== null) {
            month = '' + (Number.parseInt(inpMonth.value) - 1);
        }
        var day = inpDay !== null ? inpDay.value : '01';
        var hour = inpHour !== null ? inpHour.value : '00';
        var minute = inpMinute !== null ? inpMinute.value : '00';
        var fullDate = new Date(year, month, day, hour, minute, '0').getTime();
        app.setValue(PARAM_START_DATE, ('' + fullDate));

        let optionDateFieldSelected = false;
        for(optionDateField of inpOptionDates) {
            if(optionDateField.checked) {
                optionDateFieldSelected = true;
                app.setValue(PARAM_OPTION_DATE, optionDateField.value);
            }
        }
        if(!optionDateFieldSelected) {
            app.setValue(PARAM_OPTION_DATE, optionDateValues[1]);
        }

        if(inpMaxPages !== null) {
            try {
                Number.parseInt(inpMaxPages.value, 10);
                app.setValue(PARAM_MAX_PAGES, inpMaxPages.value);
            } catch(err) {
                console.log('Invalid max pages ' + err);
            }
        }
    }
});