var Db = require('mongodb').Db,
    Server = require('mongodb').Server,
    GridStore = require('mongodb').GridStore;

var db = new Db('test', new Server('localhost', 27017));
db.open(function(err, db) {

    var track = './media/58e286bc1a55674eb2c45c41.mp3';

    var gs = new GridStore(db, track, 'w', {
        "metadata":{
            "trackId": "58e286bc1a55674eb2c45c41"
        }
    });

    gs.open(function(err, gridStore) {
        // Write the file to gridFS
        gridStore.writeFile(track, function(err, doc) {
            console.log(doc)
            db.close();
        });
    });
});
