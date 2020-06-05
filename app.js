const express = require('express')
const app = express()
const port = 3000

const fs = require('fs');
const join = require('path').join
const AWS = require('aws-sdk');
const s3Zip = require('s3-zip');
const XmlStream = require('xml-stream');

const bucket = process.env.awsBucket;
const accessKeyId = process.env.awsAccessKeyId;
const secretAccessKey = process.env.awsAccessKeySecret;
const region = process.env.awsRegion;

AWS.config.update({
    accessKeyId,
    secretAccessKey,
    region
});

const s3 = new AWS.S3({ region: region });

function zip(files, res, galleryNamePath, photographerPath, folder) {
  console.log(files);
  const output = fs.createWriteStream(join(__dirname, galleryNamePath + '_' + photographerPath + '.zip'));
  s3Zip
  .archive({ region: region, bucket: bucket, debug: true, preserveFolderStructure: false }, folder, files)
    .pipe(res);
  res.on('finish', function(err){
    fs.unlinkSync(join(__dirname, galleryNamePath + '_' + photographerPath + '.zip'));
  });
}

app.get('/', (req, res) => {
    var folderID = req.query.folderId;
    var galleryID = req.query.galleryId;
    var photographer = req.query.photographer;
    var galleryName = req.query.galleryName;

    if (folderID == undefined || galleryID == undefined || photographer == undefined || galleryName == undefined) {
      res.status(400).send('Missing a required information i.e. folderID, galleryID, photographer, galleryName');
    }

    const folder = folderID + '/' + galleryID;
    const photographerPath = photographer.replace(" ", "-");
    const galleryNamePath = galleryName.replace(" ", "-");

    const params = {
        Bucket: bucket,
        Prefix: folder
    }

    const filesArray = [];
    const files = s3.listObjects(params).createReadStream();
    const xml = new XmlStream(files);
    xml.collect('Key')
    xml.on('endElement: Key', function(item) {
        filesArray.push(item['$text'].substr(folder.length));
    })

    xml
    .on('end', function() {
        zip(filesArray, res, galleryNamePath, photographerPath, folder);
    })
  }
)

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))