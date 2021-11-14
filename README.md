# MM5-LastFmImport
An Add-on for MediaMonkey 5 to import Last.fm play data. Still a work in progress!

## Note about development
A huge thank you to Psykar who developed the LastFMImport plugin for MM3/4:
https://github.com/Psykar/MM-LastFmImportPython

Psykar noted they are no longer using Mediamonkey, and my knowledge of VBS, Python, and even Mediamonkey's COM interface is a bit limited, so I am attempting to recreate this plugin using MM5's new Javascript interface. 

## Requirements
This addon depends on the Last.FM Service add-on provided by Ventis Media, and uses the account username from this as well as the provided API key to connect to Last.FM for retrieving recent play data.

## Settings
The default date for earliest scrobble to import is 1/1/2000. Each time the import runs it will update the settings with the current date so that it only returns scrobbles since the previous import. 

## Updates in progress
* Process unmatched scrobbles file 
* Fuzzy/configurable search of MM DB for matching tracks, for example
    * Handle missing/misplaced 'the' in artist name
    * Remove things "feat. X" and "2001 remaster" to compare track names
* Configurable page size - using 35, default is 50, max is 200
* Is the performance bad because I'm not great at Javascript? Or is it just going to be slow?
* Username override setting? Maybe they haven't logged in or want to import a different user.
