var watch = require('node-watch');
var fileProcessingService = require('./model/services/fileProcessingService');

var tracksToCheck = [];

watch('/Users/rbutcher/Music/iTunes/iTunes Media/Music', { recursive: true, followSymLinks: true }, function(filepath) {
    tracksToCheck.push(filepath);
});

setInterval(function () {
    var uniqueArray = tracksToCheck.filter(function(item, pos) {
        return tracksToCheck.indexOf(item) == pos;
    });
    tracksToCheck = [];
    fileProcessingService.processFilesystemChanges(uniqueArray);
}, 1000 * 60);
