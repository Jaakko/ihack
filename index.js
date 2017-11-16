'use strict';

const BPromise = require('bluebird');
const request = BPromise.promisifyAll(require('request'),{multiArgs: true});
var bodyParser = require('body-parser');
var express = require('express'); // Express web server framework
var qs = require('querystring'); // "querystring library

var app = express();
var port = 3000;

var log = false
var r; 
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({     // to support URL-encoded bodies
	extended: true
}));

app.get('/building-info', function(req,res) {
	var address = req.query.address; // $_GET["address"]
	var city = req.query.city; // $_GET["city"]
	var openstreetmap_api = 'http://nominatim.openstreetmap.org/search?street={+path}&format=json&polygon=1&addressdetails=1'
	var vantaa_api = 'http://geoserver.hel.fi/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeName=osm:van_rakennukset_dist&outputFormat=json&count=100&SRSNAME=EPSG:4326&BBOX={+bbox},EPSG:4326'

	var openstreetmap_api_uri = openstreetmap_api.replace('{+path}', address)
	if (city) openstreetmap_api_uri = openstreetmap_api_uri + "&city=" + city
	if (log) console.log('uri', openstreetmap_api_uri)
	//const work = BPromise.coroutine(function* (req,res) {
	loadResource(openstreetmap_api_uri)
		.then(function(body) {
			r = body.parsed[0];
			if (log) console.log('parsed', JSON.stringify(r));
			const d = 0.007
			const vantaa_api_uri = vantaa_api.replace('{+bbox}', (parseFloat(r.lon)-d )+','+(parseFloat(r.lat)-d/2)+','+(parseFloat(r.lon)+d)+','+(parseFloat(r.lat)+d/2))
			if (log) console.log('vantaa_uri', openstreetmap_api_uri)
			loadResource(vantaa_api_uri)
				.then(function(body) {
					var wsf = body.parsed;
					if (log) console.log('parsed', JSON.stringify(r));
					var i = 0;
					var response = {
						id:'',
						address: '',
						lat: '',
						lon: '',
						building_type: '',
						built_date: '',
						building_material: '',
						exterior_material: '',
						apartments: '',
						floors: '',
						area_sqm:''
					}
					if (r.lat) response.lat = r.lat
					if (r.lon) response.lon = r.lon
					if (address) response.address = address
					
					for (var j = 0; j < wsf.features.length; j++) {
						var feature = wsf.features[j];
						if (feature.properties) {						
							if (log) console.log("Webhook received unknown event " + i + ": ", feature.properties.katuosoite_suomeksi);
							i++;
							if (feature.properties.katuosoite_suomeksi == address){
								response.id = feature.properties.kiinteistotunnus
								response.address = feature.properties.katuosoite_suomeksi
								response.building_type = feature.properties.käyttötarkoitus
								response.built_date = feature.properties.valmistumispvm
								response.building_material = feature.properties.rakennusmateriaali
								response.exterior_material = feature.properties.julkisivumateriaali
								response.apartments = feature.properties.asuntoja
								response.floors = feature.properties.kerrostenlkm
								response.area_sqm = feature.properties.rakennusala
								break;
							}
						}
					}
					res.setHeader('Content-Type', 'application/json')
					res.setHeader('Access-Control-Allow-Origin', '*')
					res.status(200).send(response);
				}
			)
			}).catch(function(error) {
				if (error.statusCode === 404) {
					console.log(`Error 404: ${error.message}`);
					return BPromise.reject({
						message: `Error 404: ${error.message}`,
						statusCode: 202});
					}
				console.log(`Error: ${error.message}`);
				return BPromise.reject({
					message: error.message,
					statusCode: error.statusCode});
		});

//});
});

function loadResource(source, headers = {'Accept': 'application/json'}) {
  const result = {};
  if (log) console.log('loadResource', source)
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
	  //console.log('body', JSON.stringify(body))
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