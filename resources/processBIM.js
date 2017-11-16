
const readline = require('readline');
const fs = require('fs');
 
const rl = readline.createInterface({
	input: fs.createReadStream('Duplex_Plumbing_20121113.ifc')
    
});

var type = ''
var total = {"products":[]}
	
rl.on('line', function (line) {
	
	if (line.indexOf('IFCFLOWSEGMENT') > -1) {
		
		var res = line.split("'");
		
		var t = res[3].split(":")
		type = t[0] + ":" + t[1]
	}
	if (line.indexOf("('Length'") > -1 && line.indexOf("IFCLENGTHMEASURE") > -1) {
		console.log('Line from file:', type);
		res = line.split(",");
		//type = res[3]
		console.log('Line from file:', res[2]);
		res = res[2].split("(");
		res = res[1].substring(0, res[1].length- 1);
		console.log('Line from file:', res);
		var found = false
		for (var j = 0; j < total.products.length; j++) {
			console.log('j:' + j);
			console.log('j:' + j + ' ' + total.products[j].type + ' ' + type);
			if (total.products[j].type == type) {
				total.products[j].amount = total.products[j].amount + parseFloat(res)
				console.log('add:' + total.products[j].amount);
				console.log('type:' + total.products[j].type);
				console.log('Li', JSON.stringify(total))
				found = true
			}
		}
		if (!found) {
			total.products.push({
				"type": type,
				"amount": 0.0
			})
			found = false
		}
	}
	
});
