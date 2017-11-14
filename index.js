'use strict';

const BPromise = require('bluebird');
const request = BPromise.promisifyAll(require('request'),{multiArgs: true});
var bodyParser = require('body-parser');
var express = require('express'); // Express web server framework
var qs = require('querystring'); // "querystring library

var app = express();
var port = 3000;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
}));

app.get('/building-info', function(req,res) {
	var address = req.query.address; // $_GET["address"]
	var openstreetmap_api = 'http://nominatim.openstreetmap.org/search?street={+path}&format=json&polygon=1&addressdetails=1'
	var vantaa_api = 'http://geoserver.hel.fi/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeName=osm:van_rakennukset_dist&outputFormat=json&count=2&SRSNAME=EPSG:4326&BBOX={+bbox},EPSG:4326'
	var r; 
	const openstreetmap_api_uri = openstreetmap_api.replace('{+path}', address);
	console.log('uri', openstreetmap_api_uri)
	//const work = BPromise.coroutine(function* (req,res) {
	loadResource(openstreetmap_api_uri)
		.then(function(body) {
			r = body.parsed[0];
			console.log('parsed', JSON.stringify(r));
			console.log('bbox', r.boundingbox);
			const d = 0.0
			const vantaa_api_uri = vantaa_api.replace('{+bbox}', (parseFloat(r.boundingbox[2])-d )+','+(parseFloat(r.boundingbox[0])-d)+','+(parseFloat(r.boundingbox[3])+d)+','+(parseFloat(r.boundingbox[1])+d));
			console.log('vantaa_uri', openstreetmap_api_uri)
			loadResource(vantaa_api_uri)
				.then(function(body) {
					r = body.parsed;
					console.log('parsed', JSON.stringify(r));
					res.status(200).send(JSON.stringify(r));
				}
			)
			}).catch(function(error) {
			if (error.statusCode === 404) {
				console.log(`Needs configuration (contact Digia; reference: ${job.arguments.name})`);
			return BPromise.reject({
				message: `Needs configuration (contact Digia; reference: ${job.arguments.name})`,
				statusCode: 202});
			}
			console.log(`Configuration loading errored (${error.statusCode}) with: ${error.message}`);
			return BPromise.reject({
				message: error.message,
				statusCode: error.statusCode});
	});

//});
});

function loadResource(source, headers = {'Accept': 'application/json'}) {
  // Loading of JSON or YAML resource into a result object
  const result = {};
  console.log('loadResource', source)
  return new BPromise((resolve, reject) => {
    request.getAsync({
      uri: source,
      headers: headers
    }).spread(function(response, body) {
		
      if (response.statusCode !== 200) {
        reject({
          message: `Download of ${source} failed (${body})`,
          statusCode: response.statusCode});
      }
      result.unparsed = body;
	  console.log('body', JSON.stringify(body))
        try {
          result.parsed = JSON.parse(result.unparsed);
          result.type = 'application/json';
          resolve(result);
        } catch (jsonError) {
          reject(`The application/json at ${source} fails with: ${jsonError}`);
        }
	  resolve()
    });
  });
}


console.log('Listening on ' + port);
app.listen(process.env.PORT || port);