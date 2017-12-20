var assign = require('object-assign');
var fs = require('fs');
var os = require('os');
var request = require('request');
var cookieParser = require('cookie-parser');
var md5 = require('md5');
var LastfmAPI = require('lastfmapi');
var qs = require('querystring');
  
function LastFMService () {
    this.apikeys = JSON.parse(fs.readFileSync(os.homedir() + '/.bungalow/lastfm.key.json'));
    this.lastFM = new LastfmAPI({
        'api_key': this.apikeys.client_id,
        'secret': this.apikeys.client_secret
    });
}


LastFMService.prototype._request = function (method, method2, qs) {
    return new Promise(function (resolve, reject) {
        request({
            method: method,
            url: 'http://ws.audioscrobbler.com/2.0/',
            query: assign({
                api_key: this.apikeys.api_key,
                format: 'json',
                method: method2
            }, qs)
        }, function (err, response, body) {
            if (err) {
                reject(err);
                return;
            }
            try {
                var result = JSON.parse(body);
                resolve(result);
            } catch (e) {
                reject(500);
            }
        })
    });
}

LastFMService.prototype.getArtistByName = function (id) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.lastFM.artist.getInfo({
            artist: id
        }, function (err, artist) {
            if (err) {
                reject(err);
                return;
            }
            resolve({
                bio: {
                    description: artist.bio.summary,
                    body: artist.bio.content,
                    time: artist.bio.published
                },
                tags: artist.tags.tag.map(function (t) { return t.name}),
                description: artist.bio.summary,
                listeners: {
                    count: artist.stats.listeners
                },
                plays: {
                    count: artist.stats.plays
                },
                name:artist.name,
                
            })
        })
    });
}


LastFMService.prototype.getLoginUrl = function () {
    return this.lastFM.getAuthenticationUrl({cb: 'https://roamnia-drsounds.c9users.io/callback.html'});
}


LastFMService.prototype.authenticate = function (req, resolve) {
    var self = this;
    this.req = req;
    console.log(req);
    console.log("Ta");
    this.lastFM.authenticate(req.query.code, function (err, result)  {
        try {
            var session = {
                access_token: result.key,
                name: result.name,
                user: {
                    id: result.name,
                    username: result.name,
                    name: result.name
                },
                issued: new Date().getTime(),
                expires_in: new Date(2099, 1, 1)
            }
            resolve(null, session);
        } catch (e) {
            resolve(e);
        }
    })
}


var service = new LastFMService();


var express = require('express');


var app = express();


app.use(cookieParser());


app.use(function (req, res, next) {
    service.req = req;
    service.res = res;
   var session = req.cookies['lastfm'];
    if (!!session) {
        try {
           service.session = JSON.parse(session);
           service.lastFM.setSessionCredentials(service.session.user, service.session.access_token);
        } catch (e) {
            
        }
    }
      next();
});


app.get('/login', function (req, res) {
    res.redirect(service.getLoginUrl());
});


app.get('/authenticate', function (req, res) {
    console.log("Got authenticate request");
    console.log(req);
    service.authenticate(req, function (err, session) {
         if (err != null) {
            res.status(err).send({error: err});
            res.send();
        }
        console.log("success");
        res.clearCookie('lastfm');
        var strSession = JSON.stringify(session);
        res.cookie('lastfm', strSession);
        res.statusCode = 200;
        res.json(session);
        res.send();
    });
}); 


app.get('/login', function (req, res) {
    res.redirect(service.getLoginUrl());
});


app.get('/artist/:identifier', function (req, res) {
    service.getArtistByName(req.params.identifier).then(function (result) {
        res.json(result).send();
    }, function (err) {
        res.status(500).json(err).send();
    })
});


module.exports = {
    app: app,
    service: service
}