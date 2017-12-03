var assign = require('object-assign');
var fs = require('fs');
var os = require('os');
var request = require('request');
var cookieParser = require('cookie-parser');
var md5 = require('md5');

var qs = require('querystring');
  
function LastFMService () {
    this.apikeys = JSON.parse(fs.readFileSync(os.homedir() + '/.bungalow/lastfm.key.json'));
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
        self._request('GET', 'getArtistInfo', { artist: id}).then(function (result) {
           var artist = result.artist;
           artist.uri = 'lastfm:artist:' + id;
           artist.images = artist.image.map(function (image) {
               return {
                   url: image['#text']
               };
           });
           if (artist.bio) {
               artist.description = artist.bio.summary;
               artist.biography = artist.bio.content;
           }
           artist.service = {
               id: 'lastfm',
               name: 'Last.FM',
               uri: 'bungalow:service:lastfm'
           }
        });
    });
}


LastFMService.prototype.refreshAccessToken = function () {
    var self = this;
    return new Promise(function (resolve, fail) {
        var refresh_token = self.session.refresh_token;
        request({
            url: 'https://accounts.spotify.com/api/token',
            method: 'POST',
            form: {
                grant_type: 'refresh_token',
                refresh_token: refresh_token,
                redirect_uri: self.apikeys.redirect_uri
            },
            headers: {
                'Authorization': 'Basic ' + new Buffer(self.apikeys.client_id + ':' + self.apikeys.client_secret).toString('base64')
            }
        }, function (error, response, body) {
            var result = JSON.parse(body);
            if (error || 'error' in result) {
                fail();
                return;
            }
            console.log(self.apikeys);
            self.session = result;
            self.session.issued = new Date().getTime();
            self.session.refresh_token = refresh_token;
            service.res.clearCookie('lastfm');
            
            service.res.cookie('lastfm', JSON.stringify(result));
             console.log("Refresh", result);
            resolve(result);
        });
    });
}


LastFMService.prototype._request = function (method, path, payload, postData) {
    var self = this;
    return new Promise(function (resolve, fail) {
        if (!payload) payload = {};
        if (!payload.offset) payload.offset = 0;
        if (!isNaN(payload.offset)) payload.offset = parseInt(payload.offset);
        if (!payload.type) payload.type = 'track';
        if (!isNaN(payload.limit)) payload.limit = parseInt(payload.limit);
        if (!payload.limit) payload.limit = 30;
        
        function _do(_resolve, _fail) {
        
            var cachePath = path + '?offset=' + payload.offset + '&limit=' + payload.limit + '';
            if (false && method === 'GET' && self.cache instanceof Object && cachePath in self.cache) {
                var result = self.cache[cachePath];
                resolve(result);
                return;
            }
            
            if (!self.session) {
                fail(401);
                return;
            }
            var headers = {};
            
            headers["Authorization"] = "Bearer " + self.session.access_token;
            if (payload instanceof Object) {
                headers["Content-type"] = "application/json";
        
            } else {
                headers["Content-type"] = ("application/x-www-form-urlencoded");
            }
            var url = 'https://api.spotify.com/v1' + path;
            request({
                    method: method,
                    url: url,
                    headers: headers,
                    qs: payload,
                    body: JSON.stringify(postData)
                },
                function (error, response, body) {
                    if (error) {
                        fail(error);
                        return;
                    }
                        function formatObject (obj, i) {
                       obj.position = payload.offset + i; 
                       obj.p = payload.offset + i + 1; 
                       obj.service = service;
                       obj.version = '';
                       if (obj.type == 'country') {
                           obj.president = null;
                            if (obj.id == 'qi') {
                                obj.president = {
                                    id: 'drsounds',
                                    name: 'Dr. Sounds',
                                    uri: 'spotify:user:drsounds',
                                    images: [{
                                        url: 'http://blog.typeandtell.com/sv/wp-content/uploads/sites/2/2017/06/Alexander-Forselius-dpi27-750x500.jpg'
                                    }],
                                    type: 'user'
                                }   
                            }
                           
                       }
                       
                       if (obj.type == 'user') {
                           obj.manages = [];
                           obj.controls = []
                           if (obj.id == 'buddhalow' || obj.id == 'buddhalowmusic' || obj.id == 'drsounds') {
                               obj.president_of = [{
                                   id: 'qi',
                                   name: 'Qiland',
                                   uri: 'bungalow:country:qi',
                                   type: 'country'
                               }];
                                obj.manages.push({
                                    id: '2FOROU2Fdxew72QmueWSUy',
                                    type: 'artist',
                                    name: 'Dr. Sounds',
                                    uri: 'spotify:artist:2FOROU2Fdxew72QmueWSUy',
                                    images: [{
                                        url: 'http://blog.typeandtell.com/sv/wp-content/uploads/sites/2/2017/06/Alexander-Forselius-dpi27-750x500.jpg'
                                    }]
                                });
                                obj.manages.push({
                                    id: "1yfKXBG0YdRc5wrAwSgTBj",
                                    name: "Buddhalow",
                                    uri: "spotify:artist:1yfKXBG0YdRc5wrAwSgTBj",
                                    type: "artist",
                                    images: [{
                                        url: 'https://static1.squarespace.com/static/580c9426bebafb840ac7089e/t/580d061de3df28929ead74ac/1477248577786/_MG_0082.jpg?format=1500w'
                                    }]
                                });
                            }
                       }
                       if (obj.type == 'artist') {
                           obj.users = [];
                            obj.labels = [];
                            obj.user = {
                                id: '',
                                name: '',
                                uri: 'spotify:user:',
                                type: 'user',
                                username: ''
                            };
                           if (obj.id == '2FOROU2Fdxew72QmueWSUy') {
                                obj.user = {
                                   id: 'drsounds',
                                   name: 'Dr. Sounds',
                                   type: 'user',
                                   url: 'spotify:user:drsounds'
                               };
                               obj.users.push({
                                   id: 'drsounds',
                                   name: 'Dr. Sounds',
                                   type: 'user',
                                   url: 'spotify:user:drsounds'
                               });
                               obj.labels.push({
                                   id: 'buddhalowmusic',
                                   name: 'Buddhalow Music',
                                   type: 'label',
                                   uri: 'spotify:label:buddhalowmusic'
                               });
                               obj.labels.push({
                                   id: 'drsounds',
                                   name: 'Dr. Sounds',
                                   type: 'label',
                                   uri: 'spotify:label:drsounds'
                               });
                               obj.labels.push({
                                   id: 'recordunion',
                                   name: 'Record Union',
                                   type: 'label',
                                   uri: 'spotify:label:recordunion'
                               });
                               obj.labels.push({
                                   id: 'substream',
                                   name: 'Substream',
                                   type: 'label',
                                   uri: 'spotify:label:substream'
                               });
                           }
                           
                           
                       }
                      
                       if ('duration_ms' in obj) {
                           obj.duration = obj.duration_ms / 1000;
                       }
                       if (obj.type === 'user') {
                           obj.name = obj.id;
                       }
                       if ('track' in obj) {
                           obj = assign(obj, obj.track);
                       }
                       if ('artists' in obj) {
                           try {
                               obj.artists = obj.artists.map(formatObject);
                           } catch (e) {
                               
                           }
                       }
                       if ('album' in obj) {
                           obj.album = formatObject(obj.album, 0);
                       }
                       if ('display_name' in obj) {
                           obj.name = obj.display_name;
                       }
                       if (obj.name instanceof String && obj.name.indexOf('-') != -1) {
                           obj.version = obj.substr(obj.indexOf('-') + '-'.length).trim();
                           obj.name = obj.name.split('-')[0];
                       }
                       return obj;
                    }
                    try {
                        if (response.statusCode < 200 ||response.statusCode > 299) {
                                console.log(body);
                            fail(response.statusCode);
                            return;
                        }
                        if (body == "") {
                            resolve({
                                status: response.statusCode
                            });
                            return;
                        }
                        var data = JSON.parse(body);
                        if (!data) {
                            console.log(body);
                            fail(response.statusCode);
                        }
                        if ('error' in data || !data) {
                            console.log(body);
                            fail(response.statusCode);
                            return;
                        }
                        data.service = {
                            name: 'Spotify',
                            id: 'spotify',
                            type: 'service',
                            description: ''
                        }
                        if ('items' in data) {
                            data.objects = data.items;
                            delete data.items;
                        }
                        if ('categories' in data) {
                            data.objects = data.categories.items.map((o) => {
                                o.uri = 'spotify:category:' + o.id;
                                o.type = 'category';
                                o.images = o.icons;
                                delete o.icons;
                                return o;
                            });
                            delete data.categories;
                        }
                        if ('tracks' in data) {
                            if (data.tracks instanceof Array) {
                                data.objects = data.tracks;
                            } else {
                                data.objects = data.tracks.items;
                            }
                            delete data.tracks;
                        }
                        if (!('images' in data)) {
                            data.images = [{
                                url: ''
                            }];
                        }
                        if ('album' in data) {
                            data.album = formatObject(data.album);
                            delete data.albums;
                        }
                        
                        if ('owner' in data) {
                            data.owner = formatObject(data.owner);
                            delete data.albums;
                        }
                        if ('artists' in data) {
                            data.objects = data.artists.items;
                        }
                        if ('objects' in data && data.objects && data.type != 'artist') {
                            data.objects = data.objects.map(formatObject);
                           
                        }
                        if ('artists' in data && data.type == 'album') {
                           data.artists = data.artists.map(formatObject);
                        }
                        data = formatObject(data, 0);
                        console.log(data);
                        data.updated_at = new Date().getTime();
                        self.cache[cachePath] = data;
                        fs.writeFileSync(cache_file, JSON.stringify(self.cache));
                        resolve(data);
                        
                    } catch (e) {
                        
                        fail(e);
                    }
                }
                
            );
        }
        
        if (new Date().getTime() - self.session.issued < self.session.expires_in * 1000) {
            
             _do(resolve, fail);
        }  else {
           self.refreshAccessToken().then(function (result) {
                _do(resolve, fail);
            });
        }
        
        
    });
}


LastFMService.prototype.getLoginUrl = function () {
    return 'http://www.last.fm/api/auth/?api_key=' + this.apikeys.client_id;
}


LastFMService.prototype.authenticate = function (req, resolve) {
    var self = this;
    this.req = req;
    console.log(req);
    console.log("Ta");
    request({
        url: 'http://ws.audioscrobbler.com/2.0/auth.getSession?' + qs.stringify({
            token: req.query.code,
            api_key: self.apikeys.client_id,
            api_sig: md5("api_key" + self.apikeys.client_id +"auth.getSessiontoken" + req.query.code + self.apikeys.client_secret)
        }),
        method: 'GET'
    }, function (error, response, body) {
        console.log(error);
        var data = JSON.parse(body);
        if (error || !data.key) {
            resolve(error);
            return;
        }
        var result = {
            access_token: data.key
        };
        result.issued = new Date().getTime();
        
        resolve(null, result);
    });
}


var service = new LastFMService();


var express = require('express');


var app = express();


app.use(cookieParser());


app.use(function (req, res, next) {
    service.req = req;
    service.res = res;
   var session = req.cookies['lastfm'];
    if (!!session)
       service.session = JSON.parse(session);
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