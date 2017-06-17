'use strict';

const api = {};
api.native = {};
api.native.http   = require('http');
api.native.fs     = require('fs');
api.native.url    = require('url');
api.native.path   = require('path');

const MIME_TYPES = {
  // txt types
  '.html' : 'text/html',
  '.css'  : 'text/css',
  '.js'   : 'text/javascript',
  '.json' : 'application/json',
  '.txt'  : 'text/plain',
  '.csv'  : 'text/csv',
  '.xml'  : 'text/xml',
  // image types
  '.png'  : 'image/png',
  '.jpg'  : 'image/jpeg',
  '.ico'  : 'image/vnd.microsoft.icon',
  '.svg'  : 'image/svg+xml',
  '.gif'  : 'image/gif',
  '.tiff' : 'image/tiff',
  '.tif'  : 'image/tiff',
  // audio types
  '.wav'  : 'audio/wav',
  '.mp3'  : 'audio/mpeg',
  '.aac'  : 'audio/aac',
  '.midi' : 'audio/midi',
  // video types
  '.mp4'  : 'video/mp4',
  '.mpg'  : 'video/mpeg',
  '.mpeg' : 'video/mpeg',
  '.webm' : 'video/webm',
  // font types
  '.eot'    : 'appliaction/vnd.ms-fontobject',
  '.ttf'    : 'aplication/font-sfnt',
  '.otf'    : 'application/font-otf',
  '.woff'   : 'application/font-woff',
  '.woff2'  : 'application/font-woff2',
  // other types
  '.pdf'      : 'application/pdf',
  '.zip'      : 'application/zip',
  '.zipx'     : 'application/zip',
  '.gz'       : 'application/gzip',
  '.atom'     : 'application/atom+xml',
  '.torrent'  : 'application/x-bittorrent',
  '.ogg'      : 'application/ogg',
  '.ogv'      : 'application/ogg',
  '.oga'      : 'application/ogg',
  '.ogx'      : 'application/ogg',
  '.spx'      : 'application/ogg',
  '.opus'     : 'application/ogg',
  '.ogm'      : 'application/ogg'
};

const server = api.native.http.createServer((req, res) => {
  const userIp = req.connection.remoteAddress || req.socket.remoteAddress;
  let file = '.' + api.native.url.parse(req.url).pathname;
  if (file === './') file = './index.html';
  api.native.fs.readFile(file, (err, data) => {
    if (err) {
      res.statusCode = 404;
      res.statusMessage = api.native.http.STATUS_CODES[404];
      res.end();
    } else {
      res.setHeader('Content-Type', MIME_TYPES[api.native.path.extname(file)] || 'text/plain');
      res.statusCode = 200;
      res.statusMessage = api.native.http.STATUS_CODES[200];
      res.end(data, 'binary');
    }
  });
});

server.listen(80, 'localhost', () => console.log('Server running at localhost:80'));
