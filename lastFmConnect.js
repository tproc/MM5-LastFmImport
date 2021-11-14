
const makeHTTPRequestGET = function (url) {
    return new Promise(function (resolve, reject) {
        var headers = newStringList();
        headers.add('User-Agent: MediaMonkey/' + app.utils.getApplicationVersion(4) + ' ( http://www.mediamonkey.com )');
        headers.add('Accept: application/json');
        
        var doneCallback = function (status, responseText) {
            if (status === 200) {
                var pageResponseFile = app.filesystem.getDataFolder() + 'Scripts\\LastFmImport\\page.txt';
                app.filesystem.saveTextToFileAsync(pageResponseFile, responseText, {
                    append: false
                }).then(() => {
                    var resObj = JSON.parse(responseText);
                    if ((resObj !== undefined) && isObjectLiteral(resObj)) {
                        resolve(resObj);
                    } else {
                        reject('last.fm makeHTTPRequest error status ' + status + ': ' + responseText);
                    }
                });
            } else {
                reject('last.fm makeHTTPRequest error status ' + status + ': ' + responseText);
            }
        };
        
        app.utils.web.requestAsync({
            uri: url,
            method: 'GET',
            headers: headers,
            doneCallback: doneCallback
        });
    });
};
const sendLastFmRequest = function (rootUrl, params) {
    // sort params alphabetically by parameter name
    params.sort();
    // concatenate all strings and secret key
    var concParams = '';
    forEach(params, function (paramPair) {
        concParams += paramPair[0] + paramPair[1];
    });

    // prepare whole query
    var query = rootUrl + '?';
    
    forEach(params, function (paramPair, idx) {
        if (idx > 0) {
            query += '&';
        }
        query += paramPair[0] + '=' + encodeURIComponent(paramPair[1]);
    });
    ODS('last.fm: going to send: ' + query);
    return localPromise(makeHTTPRequestGET(query));
};

function getRecentTracksPage(page, importProcess) {
    const pageStr = ('' + page);
    return sendLastFmRequest(importProcess.ROOT_URL, [
            ['method', 'user.getRecentTracks'], 
            ['user', importProcess.username], 
            ['api_key', importProcess.apiKey], 
            ['limit', ('' + importProcess.pageSize)], 
            ['format', 'json'], 
            ['page', pageStr]
    ]);
}
