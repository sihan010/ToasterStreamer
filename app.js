//imports
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var WebTorrent = require('webtorrent');
var fp = require("find-free-port");

//initializing
var app = new express();
var client = new WebTorrent();
var server = null;

//Setting View Engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug')

//body-parser init
var jsonParser = bodyParser.json()
var urlencodedParser = bodyParser.urlencoded({
    extended: false
})

//variables
var downloadedTorrent = null;
var torrentServer = null;
var magnet = 'magnet:?xt=urn:btih:c168b84fc2b8cf062b67e4168e35c98f10bc7c74&dn=The+Godfather+%281972%29'
var torrentPort = 3000;
var mainPort = 1337;

//Get free port for torrent server
fp(3000, 3100, 'localhost', 1, (err, p1) => {
    torrentPort = p1;
});

//get index
app.get('/', (req, res) => {
    if (torrentServer != null) {
        console.log('Closing old torrent Server from app index ');
        torrentServer.close();
        client.destroy();
    }
    client = new WebTorrent();
    let files = [];
    client.add(magnet, (torrent) => {
        console.log('Client is downloading:', torrent.infoHash)
        torrent.files.forEach(function (file) {
            files.push(file.name);
        })
        res.render('index', {
            title: 'Toaster Streamer',
            files,
            port: mainPort,
            error: false
        });
        torrentServer = torrent.createServer();
        torrentServer.listen(torrentPort, (req, res) => {
            console.log(`torrent server listening to localhost ${torrentPort}`)
        })
    })
})

//Webtorrent error handling
client.on('error', (err) => {
    console.log(err);
    client.destroy();
})

//Stream file on iframe
app.get("/:id", (req, res) => {
    const id = req.params.id;
    res.render('frame', {
        port: torrentPort,
        id
    });
})

//Create App Server
server = app.listen(mainPort, function (err, req, res) {
    if (err) {
        fp(3000, 3100, 'localhost', 1, (err, p1) => {
            mainPort = p1;
            server.listen(mainPort, () => {
                console.log(`main server listening to localhost ${mainPort}`)
            })
        });
    } else {
        console.log(`main server listening to localhost ${mainPort}`)
    }
})

//App server Error Handling
server.on('error', () => {
    server.close(() => {
        console.log('Server closed!')
    });
})

//On process close, Destroy everything
process.on('SIGINT', () => {
    server.close(() => {
        if (torrentServer != null)
            torrentServer.close()
        client.destroy()
    });
});