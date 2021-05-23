

var importProcess = {
    MAX_PAGES: 10, //500
    ROOT_URL: 'http://ws.audioscrobbler.com/2.0/',
    apiKey: app.utils.web.getAPIKey('lastfmApiKey'),
    progress: app.backgroundTasks.createNew(),
    username: '',
    unmatchedFilename: '',
    startDate: -1,
    updateCt: 0,
    errorCt: 0,
    unmatchCt: 0,
    testMode: false
};

class TrackData {
    artist;
    album;
    song;
    date;

    constructor(artist, album, song, date) {
        this.artist = artist;
        this.album = album;
        this.song = song;
        this.date = date;
    }
};

const buildSearchSql = function(trackData) {
    var sql = 'SELECT * FROM SONGS WHERE';
    sql += ' LOWER(Artist) = LOWER(\'' + trackData.artist + '\')';
    sql += 'AND LOWER(SongTitle) = LOWER(\'' + trackData.song + '\')';
    return sql;
};

// function for quoting strings converted to plain ASCII
function QAStr(astr) {
    if(typeof astr === 'undefined' || astr === null) return '';
    return String.fromCharCode(34) + (astr.replace(/"/g, '""')) + String.fromCharCode(34);
}

const processPage = async function(res, pageNum) {
    if (!res || !res.recenttracks) {
        messageDlg('Nothing returned', 'Error', ['btnOK'], undefined, () => {});
        return false;
    } else {
        var trackplays = res.recenttracks.track;
        var pageList = app.utils.createTracklist(true);
        var pageTracks = [];
        for(var i = 0; i < trackplays.length; i++) {
            try {
                var trackplay = trackplays[i];
                let artist = trackplay.artist['#text'];
                let album =  trackplay.album['#text'];
                let song =  trackplay.name;
                let scDate = trackplay.date.uts * 1000;
                let td = new TrackData(artist, album, song, scDate);
                pageTracks.push(td);
                let trackResult = app.db.getTracklist(buildSearchSql(td), -1);
                await trackResult.whenLoaded().then(() => {
                    if(trackResult.count === 1) {
                        pageList.addList(trackResult);
                    } else {
                        importProcess.unmatchCt += 1;
                        var txt = [QAStr(artist),QAStr(album),QAStr(song),QAStr('' + scDate)].join(',') + '\r\n';
                        app.filesystem.saveTextToFileAsync(importProcess.unmatchedFilename, txt, {
                            append: true
                        });
                    }
                });
            } catch(err) {
                ODS('Failed to process track: ' + err);
            }
        }
        pageList.locked(function() {
            var i = 0;
            while (i < pageList.count) {
                const track = pageList.getValue(i);
                const trackData = pageTracks[i];
                track.playCounter = track.playCounter + 1;
                if(track.lastTimePlayed.getTime() < trackData.date) {
                    track.lastTimePlayed = new Date(trackData.date);
                }
                i++;
                importProcess.updateCt += 1; 
            }
            pageList.commitAsync(true);
        });
        return true;
    }
};

actions.lastFmImport = {
    execute: () => {
        if(importProcess.testMode) {
            const td = new TrackData('The Weather Station', 'Loyalty', 'Tapes', 1620753840000);
            let trackResult = app.db.getTracklist(buildSearchSql(td), -1);
            trackResult.whenLoaded().then(() => {
                trackResult.locked(function() {
                    let t = trackResult.getValue(0);
                    let result = 'typeof t -- ' + (typeof t) + ' -- ' + JSON.stringify(t) + ' -- ' + t.title;
                    messageDlg('Test Mode Result ' + result, 'Information', ['btnOK'], undefined, () => {});
                });
            });
        } else {
            localPromise(lastfm.getUserInfo()).then(function (ui) {
                if (!ui || !ui.user || !lastfm.scrobblerState.sessionKey) {
                    messageDlg('Unable to get last.fm user details', 'Error', ['btnOK'], undefined, () => {});
                    return;
                }
                importProcess.username = ui.user.name;
                importProcess.startDate = Number.parseInt(app.getValue('lastFmImport_paramdate', '946706400000'),10);
                importProcess.unmatchedFilename = app.filesystem.getDataFolder() + 'Scripts\\LastFmImport\\unmatched.txt';
                messageDlg('Connecting to last.fm as user ' + importProcess.username, 'Information', ['btnOK'], undefined, async() => {
                    importProcess.progress.leadingText = _('Importing from last.fm for user ' + importProcess.username) + '...';
                    let maxPages = importProcess.MAX_PAGES;
                    for(let page = 1; page <= maxPages && !importProcess.progress.terminated; page++) {
                        await getRecentTracksPage(page, importProcess).then(async(res) => {
                            if(page === 1) {
                                let totalPages = res.recenttracks['@attr'].totalPages;
                                if(totalPages < maxPages) maxPages = totalPages;
                            } 
                            importProcess.progress.leadingText = _('Importing from last.fm for user ' + importProcess.username) 
                                    + ', handling page ' + page + '/' + maxPages + ' ...';
                            let pgResult = await processPage(res, page);
                            if(!pgResult) {
                                importProcess.progress.terminate();
                            } else if(res.recenttracks.track[0].date.uts * 1000 < importProcess.startDate) {
                                maxPages = -1;   
                            }
                        });
                    }
                    
                    // Process previously unmatched

                    if (importProcess.progress.terminated) {
                        messageDlg('Last.FM Import Operation was terminated.', 'Error', ['btnOK'], undefined, () => {});
                    } else {
                        messageDlg('Last.FM Import Operation has completed with ' + importProcess.updateCt + ' tracks updated, ' 
                            + importProcess.unmatchCt + ' tracks left unmatched.', 'Information', ['btnOK'], undefined, () => {
                            app.setValue('lastFmImport_paramdate', Date.now());
                        });
                    }
                    importProcess.progress.leadingText = '';
                });

            });
        }
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
