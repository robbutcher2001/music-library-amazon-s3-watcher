var cacheManagementService = require('./cacheManagementService');

const filePath = './media/58e286bc1a55674eb2c45c41.mp3';
const trackId = '58e286bc1a55674eb2c45c41rib';

cacheManagementService.putCache(filePath, trackId).then(function() {
    console.log('Written to db')
    cacheManagementService.getCache(trackId).then(function() {
        console.log('Got from db')
    }).catch(function(error) {
        console.error(error);
    });
}).catch(function(error) {
    console.error(error);
});
