// Load the S3 SDK for JavaScript
var AWS = require('aws-sdk/clients/s3');
// Load credentials and set region from JSON file
// TODO: regen and move to DB and store in private container image
// http://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials.html
AWS.config.loadFromPath('./s3_config.json');

// Create S3 service object
s3 = new AWS.S3();

var params = {Bucket: 'robertbutcher.co.uk-music-library'};

var allKeys = [];
function listAllKeys(marker, cb) {
  s3.listObjects({Bucket: s3bucket, Marker: marker}, function(err, data) {
    allKeys.push(data.Contents);

    if (data.IsTruncated)
      listAllKeys(data.NextMarker, cb);
    else
      cb();
  });
};

// Call S3 to list current buckets
s3.listBuckets(function(err, data) {
  listAllKeys();
  console.log("Recursive bucket", allKeys);
   if (err) {
      console.log("Error", err);
   } else {
      console.log("Bucket List", data.Buckets);
   }
});
