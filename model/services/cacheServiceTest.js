var cacheManagementService = require('./cacheManagementService');

const filePath = './media/58e286bc1a55674eb2c45c41.mp3';
const trackId = '58eb93df5f97af50c45e401e';

// cacheManagementService.putCache(filePath, trackId).then(function() {
//     console.log('Written to db')
// }).catch(function(error) {
//     console.error(error);
// });

cacheManagementService.getCache(trackId).then(function(retrievedTrack) {
    console.log('Got from db ' + retrievedTrack)
}).catch(function(error) {
    console.error(error);
});

// cacheManagementService.checkCache(trackId).then(function(retrievedTrack) {
//     console.log('Got from db ' + retrievedTrack)
// }).catch(function(error) {
//     console.error(error);
// });
