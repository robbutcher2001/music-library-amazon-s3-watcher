var mongoose = require('mongoose');
var trackCacheSchema = mongoose.Schema({
    trackId: String,
    data: Buffer,
});

module.exports = mongoose.model('trackCache', trackCacheSchema);
