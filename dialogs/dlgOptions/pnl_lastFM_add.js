
var inpYear = null;
var inpMonth = null;
var inpDay = null;
var inpHour = null;
var inpMinute = null;
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
        
        var paramDate = new Date(Number.parseInt(app.getValue('lastFmImport_paramdate', '946706400000'),10));
        var importEntryDiv = document.createElement('div');
        inpYear = createInput(importEntryDiv, 'Year', ('' + paramDate.getFullYear()));
        inpMonth = createInput(importEntryDiv, 'Month', ('' + (paramDate.getMonth() + 1)));
        inpDay = createInput(importEntryDiv, 'Day', ('' + paramDate.getDate()));
        inpHour = createInput(importEntryDiv, 'Hour', ('' + paramDate.getHours()));
        inpMinute = createInput(importEntryDiv, 'Minute', ('' + paramDate.getMinutes()));
        //var updateBtn = document.createElement('button');
        importOptionsDiv.appendChild(importEntryDiv);
        
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
        app.setValue('lastFmImport_paramdate', ('' + fullDate));
    }
});