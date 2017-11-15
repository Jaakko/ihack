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
	var vantaa_api = 'http://geoserver.hel.fi/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeName=osm:van_rakennukset_dist&outputFormat=json&count=100&SRSNAME=EPSG:4326&BBOX={+bbox},EPSG:4326'
	var r; 
	const openstreetmap_api_uri = openstreetmap_api.replace('{+path}', address);
	console.log('uri', openstreetmap_api_uri)
	//const work = BPromise.coroutine(function* (req,res) {
	loadResource(openstreetmap_api_uri)
		.then(function(body) {
			r = body.parsed[0];
			console.log('parsed', JSON.stringify(r));
			//console.log('bbox', r.boundingbox);
			const d = 0.005
//			const vantaa_api_uri = vantaa_api.replace('{+bbox}', (parseFloat(r.boundingbox[2])-d )+','+(parseFloat(r.boundingbox[0])-d)+','+(parseFloat(r.boundingbox[3])+d)+','+(parseFloat(r.boundingbox[1])+d));
			const vantaa_api_uri = vantaa_api.replace('{+bbox}', (parseFloat(r.lon)-d )+','+(parseFloat(r.lat)-d/2)+','+(parseFloat(r.lon)+d)+','+(parseFloat(r.lat)+d/2))
			console.log('vantaa_uri', openstreetmap_api_uri)
			loadResource(vantaa_api_uri)
				.then(function(body) {
					r = body.parsed;
					console.log('parsed', JSON.stringify(r));
					var i = 0;
					var response = {
						id:'',
						address: '',
						building_type: '',
						built_date: '',
						building_material: '',
						exterior_material: '',
						apartments: '',
						floors: '',
						area_sqm:''
					}
					//r.features.forEach(function(feature) {
					for (var j = 0; j < r.features.length; j++) {
						var feature = r.features[j];
						if (feature.properties) {						
							console.log("Webhook received unknown event " + i + ": ", feature.properties.katuosoite_suomeksi);
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