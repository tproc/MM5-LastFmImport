

var importProcess = {
    pageSize: 35,
    ROOT_URL: 'http://ws.audioscrobbler.com/2.0/',
    apiKey: app.utils.web.getAPIKey('lastfmApiKey'),
    progress: null,
    username: '',
    unmatchedFilename: '',
    tracksFilename: '',
    startDate: -1,
    listCt: 0,
    updateCt: 0,
    errorCt: 0,
    unmatchCt: 0,
    testMode: false,
    dateStamp: 0
};

const buildSearchSql = function(artist, song, album) {
    let sArtist = artist.replaceAll("'","''");
    let sSong = song.replaceAll("'","''");
    if(album === null) {
        var sql = 'SELECT * FROM SONGS WHERE';
        sql += ' LOWER(Artist) = LOWER(\'' + sArtist + '\')';
        sql += 'AND LOWER(SongTitle) = LOWER(\'' + sSong + '\')';
        return sql;
    } else {
        let sAlbum = album.replaceAll("'","''");
        var sql = 'SELECT * FROM SONGS WHERE';
        sql += ' LOWER(Artist) = LOWER(\'' + sArtist + '\')';
        sql += 'AND LOWER(SongTitle) = LOWER(\'' + sSong + '\')';
        sql += 'AND LOWER(Album) = LOWER(\'' + sAlbum + '\')';
    }
};

// function for quoting strings converted to plain ASCII
function QAStr(astr) {
    if(typeof astr === 'undefined' || astr === null) return '';
    return String.fromCharCode(34) + (astr.replace(/"/g, '""')) + String.fromCharCode(34);
}

function unQAStr(astr) {
    if(typeof astr === 'undefined' || astr === null) return '';
    return astr.replace(/""/g, '"').replace(/^"|"$/g, '');
}

const savePage = function(res) {
    if (!res || !res.recenttracks) {
        messageDlg('Nothing returned', 'Error', ['btnOK'], undefined, () => {});
        return false;
    } else {
        var trackplays = res.recenttracks.track;
        var txt = '';
        for(var i = 0; i < trackplays.length; i++) {
            try {
                var trackplay = trackplays[i];
                let artist = trackplay.artist['#text'];
                let album =  trackplay.album['#text'];
                let song =  trackplay.name;
                let scDate = trackplay.date.uts * 1000;
                if(scDate >= importProcess.startDate) {
                    txt += [QAStr(artist),QAStr(album),QAStr(song),QAStr('' + scDate)].join('||') + '\r\n';
                }
            } catch(err) {
                ODS('Failed to process track: ' + err);
                importProcess.errorCt += 1;
            }
        }
        app.filesystem.saveTextToFileAsync(importProcess.tracksFilename, txt, {
            append: true
        });
        return true;
    }
};

const processFile = async function(filename, importProcess, progressText) {
    return await app.filesystem.loadTextFromFileAsync(filename).then(async(contents) => {
        var pageList = app.utils.createTracklist(true);
        var trackDates = new Map();
        for(var csvLine of contents.split('\r\n')) {
            if(csvLine !== '') {
                var track = csvLine.split('||');
                let artist = unQAStr(track[0]);
                let album =  unQAStr(track[1]);
                let song =  unQAStr(track[2]);
                let scDate = unQAStr(track[3]);
                let td = artist + ' - ' + song;
                importProcess.listCt += 1;
                if(typeof artist !== 'undefined' && typeof song !== 'undefined') {
                    console.debug('Processing track "' + td + '" from track CSV: ' + track);
                    let trackResult = app.db.getTracklist(buildSearchSql(artist, song, null), -1);
                    await trackResult.whenLoaded();
                    if(trackResult.count === 1) {
                        pageList.addList(trackResult);
                        trackDates.set(td, scDate);
                    } else if(trackResult.count > 1) {
                        var fIndex = -1;
                        trackResult.locked(function () {
                            for(var i = 0; i < trackResult.count; i++) {
                                var track = trackResult.getValue(i);
                                if(track.album === album) {
                                    fIndex = i;
                                }
                            }
                        });
                        if(fIndex < 0) {
                            await app.filesystem.saveTextToFileAsync(importProcess.unmatchedFilename + "." + importProcess.dateStamp + ".txt", 
                                csvOut, { append: true });
                            importProcess.unmatchCt += 1;
                            let csvOut = csvLine + '\r\n';
                        } else {
                            pageList.addList(trackResult.getRange(fIndex, fIndex));
                            trackDates.set(td, scDate);
                        }
                    } else {
                        importProcess.unmatchCt += 1;
                        let csvOut = csvLine + '\r\n';
                        await app.filesystem.saveTextToFileAsync(importProcess.unmatchedFilename + "." + importProcess.dateStamp + ".txt", 
                            csvOut, { append: true });
                    }
                } else {
                    console.log('Could not process track CSV: ' + track);
                }
            }
        }

        pageList.locked(function() {
            var ind = 1;
            pageList.forEach(track => {
                let trackDateParam = app.getValue('lastFmImport_paramoptionddate','Update Play Counts if Newer');

                importProcess.progress.leadingText = progressText + ' - ' + ind + ' / ' + pageList.count;

                let trackDate = trackDates.get(track.artist + ' - ' + track.title);
                if(track.lastTimePlayed.getTime() < trackDate) {
                    let trackDateObj = new Date();
                    trackDateObj.setTime(trackDate);
                    track.lastTimePlayed = trackDateObj;
                    track.playCounter = track.playCounter + 1;
                    importProcess.updateCt += 1;
                } else if(track.lastTimePlayed.getTime() > trackDate && trackDateParam === 'Update Play Counts if Not Matching') {
                    track.playCounter = track.playCounter + 1;
                    importProcess.updateCt += 1;
                } else if(trackDateParam === 'Update Play Counts For All') {
                    track.playCounter = track.playCounter + 1;
                    importProcess.updateCt += 1;
                } else {
                    console.debug('Skipping track since it was played in MediaMonkey: ' + track.artist + ' - ' + track.title);
                }
                ind += 1;
            });
            pageList.commitAsync(true);
        });
    });
}

actions.lastFmImport = {
    execute: () => {
        importProcess.progress = app.backgroundTasks.createNew();
        localPromise(lastfm.getUserInfo()).then(function (ui) {
            if (!ui || !ui.user || !lastfm.scrobblerState.sessionKey) {
                messageDlg('Unable to get last.fm user details', 'Error', ['btnOK'], undefined, () => {});
                return;
            }
            importProcess.username = ui.user.name;
            importProcess.startDate = Number.parseInt(app.getValue('lastFmImport_paramdate', '946706400000'),10);
            importProcess.unmatchedFilename = app.filesystem.getDataFolder() + 'Scripts\\LastFmImport\\unmatched.txt';
            importProcess.tracksFilename = app.filesystem.getDataFolder() + 'Scripts\\LastFmImport\\tracks.txt';
            importProcess.dateStamp = Date.now();
            messageDlg('Connecting to last.fm as user ' + importProcess.username, 'Information', ['btnOK'], undefined, async() => {
                // Get data from last.fm and save to tracks.txt
                importProcess.progress.leadingText = _('Importing from last.fm for user ' + importProcess.username) + '...';
                let del1 = await app.filesystem.deleteFileAsync(importProcess.tracksFilename);
                let maxPages =  Number.parseInt(app.getValue('lastFmImport_maxpages', '100'), 10);
                for(let page = 1; page <= maxPages && !importProcess.progress.terminated; page++) {
                    await getRecentTracksPage(page, importProcess).then((res) => {
                        if(page === 1) {
                            let totalPages = res.recenttracks['@attr'].totalPages;
                            if(totalPages < maxPages) maxPages = totalPages;
                        } 
                        importProcess.progress.leadingText = _('Importing from last.fm for user ' + importProcess.username) 
                                + ', handling page ' + page + ' ...';
                        let pgResult = savePage(res);
                        if(!pgResult) {
                            importProcess.progress.terminate();
                        } else if(res.recenttracks.track.length > 0 && typeof res.recenttracks.track[0].date !== 'undefined' 
                                && res.recenttracks.track[0].date.uts * 1000 < importProcess.startDate) {
                            maxPages = -1;   
                        }
                        return res;
                    });
                }
                
                // Process unmatched.txt
                if(await app.filesystem.fileExistsAsync(importProcess.unmatchedFilename)) {
                    var progressText = _('Importing from last.fm for user ' + importProcess.username) 
                        + ', processing the previous unmatched tracks';
                    importProcess.progress.leadingText = progressText;
                    await processFile(importProcess.unmatchedFilename, importProcess, progressText);
                }

                // Process tracks.txt
                if(await app.filesystem.fileExistsAsync(importProcess.tracksFilename)) {
                    var progressText = _('Importing from last.fm for user ' + importProcess.username) 
                        + ', processing the current tracks';
                    importProcess.progress.leadingText = progressText;
                    await processFile(importProcess.tracksFilename, importProcess, progressText);
                }

                if(await app.filesystem.fileExistsAsync(importProcess.unmatchedFilename + "." + importProcess.dateStamp + ".txt")) {
                    await app.filesystem.deleteFileAsync(importProcess.unmatchedFilename);
                    await app.filesystem.renameFile(importProcess.unmatchedFilename + "." + importProcess.dateStamp + ".txt", 
                            importProcess.unmatchedFilename);
                }

                // Complete process
                importProcess.progress.leadingText = '';
                if (importProcess.progress.terminated) {
                    messageDlg('Last.FM Import Operation was terminated.', 'Error', ['btnOK'], undefined, () => {});
                } else {
                    messageDlg('Last.FM Import Operation has completed, processed ' + importProcess.listCt + ' tracks with ' +
                             importProcess.updateCt + ' tracks updated, ' 
                        + importProcess.unmatchCt + ' tracks left unmatched.', 'Information', ['btnOK'], undefined, () => {
                        if(!importProcess.testMode) {
                            app.setValue('lastFmImport_paramdate', importProcess.dateStamp);
                        }
                        importProcess.progress.terminate();
                    });
                }
            });

        });
    },
    icon: 'synchronize',
    title: function() {
        return _('Last.FM Import');
    },
    disabled: false,
    visible: true,
};

window._menuItems.tools.action.submenu.push({
    action: actions.lastFmImport,
    order: 100,
    grouporder: 100
});
