var s3MusicService = require('./model/services/s3MusicService');
var processing = false;

console.log("Polling S3 for new tracks at 1 minute intervals..");
setInterval(function () {
    if (!processing) {
        processing = !processing;
        s3MusicService.getTracksInS3().then(function(trackKeys) {
            s3MusicService.identifyTrackChanges(trackKeys, 0).then(function(newTracks) {
                if (newTracks.length > 0) {
                    console.log('Total of [' + newTracks.length + '] new tracks found, processing..');
                    s3MusicService.updateDatabaseModel(newTracks, 0, function() {
                        processing = false;
                        console.log('Processing complete, sleeping..\n');
                    }).catch(function(error) {
                        console.error(error, error.stack);
                    });
                }
            });
        }).catch(function(error) {
            console.error(error, error.stack);
        });
    }
}, 1000 * 60);
