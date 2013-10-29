var cityArray = require('./cityarray');
var natural = require('natural');
var tokenizer = new natural.WordTokenizer();

if(typeof(Number.prototype.toRad) === "undefined") {
    Number.prototype.toRad = function () {
        return this * Math.PI / 180;
    }
}

var getDistance = function(start, end, decimals) {
    decimals = decimals || 2;
    var earthRadius = 6371; // km
    lat1 = parseFloat(start.latitude);
    lat2 = parseFloat(end.latitude);
    lon1 = parseFloat(start.longitude);
    lon2 = parseFloat(end.longitude);
 
    var dLat = (lat2 - lat1).toRad();
    var dLon = (lon2 - lon1).toRad();
    var lat1 = lat1.toRad();
    var lat2 = lat2.toRad();
 
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = earthRadius * c;
    return Math.round(d * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

var replaceAll = function(txt,old,nw){
	while(txt.indexOf(old)>-1){
		txt = txt.replace(old,nw);
	}
	return txt;
}

var removePunctuation = function(txt){
	var punctuation = ['\'','.',',',';','!',':',')','(','<','>','[',']','{','}','*','?','#','-','"'];
	for(var p in punctuation){
		txt = replaceAll(txt,punctuation[p],'');
	}
	return txt;
}

var $ = {};

$.textIndex = {};
$.sndxIndex = {};
$.distIndex = {};

$.index = function(callback){
	console.log('indexing..');
	for(var i in cityArray){
		$.indexText(cityArray[i].city,i);
		$.indexByDistance(cityArray[i],i);
	}
	console.log('done');
	if(callback){
		callback(null,'done');
	}
}

$.indexText = function(city,id){
	city = city.toLowerCase();
	//get rid of punctuation
	city = removePunctuation(city);
	//console.log(city);
	
	$.textIndex[city] = [id];
	$.indexSndx(w,id);
	
	for(var i = 0; i<=city.length; i++){
		var w = city.substr(0,i);
		if(!$.textIndex[w]){
			$.textIndex[w] = [];
		}
		if($.textIndex[w].indexOf(id)===-1){
			$.textIndex[w].push(id);
		}
		
		//do soundex
		$.indexSndx(w,id);
	}
}

var doSndx = function(wrd){
	if(wrd){
		var arWrd = wrd.split(' ');
		var arSndx = [];
		for(var i in arWrd){
			arSndx.push(natural.SoundEx.process(arWrd[i]));
		}
		return arSndx.join(' ');
	}
	else{
		return '';
	}
}

$.indexSndx = function(city, id){
	var sndx = doSndx(city);
	if(!$.sndxIndex[sndx]){
		$.sndxIndex[sndx] = [];
	}
	if($.sndxIndex[sndx].indexOf(id)===-1){
		$.sndxIndex[sndx].push(id);
	}
}

$.indexByDistance = function(item,id){
	var distance = {1:[],5:[],10:[],20:[],50:[],100:[],500:[],1000:[],10000:[]};
	var _d = [10000,10000,1000,500,100,50,20,10,5,1];
	for(var i in cityArray){
		if(item.city != cityArray[i].city){
			var dist = getDistance(
				{latitude:item.lat,longitude:item.long},
				{latitude:cityArray[i].lat,longitude:cityArray[i].long},
			2);
			for(var d in _d){
				var ds = _d[d];
				if(dist>ds){
					ds = _d[d-1].toString();
					if(distance[ds].indexOf(i)===-1){
						distance[ds].push({id:i,dist:dist});
					}
					break;
				}
			}
			
		}
	}
	$.distIndex[id] = distance;
}

$.getItemsById = function(idAr){
	var ar = [];
	if(idAr){
		idAr.forEach(function(id){
			var item = cityArray[id];
			item.id = id;
			if(item){
				ar.push(item);
			}
		});
	}
	return ar;
}

$.getCityByText = function(txt,region,country){
	txt = txt.toLowerCase();
	txt = removePunctuation(txt);
	var items = $.getItemsById($.textIndex[txt]);
	console.log(items.length);
	if(items.length ===0){
		//try mtphn
		var sndx = doSndx(txt);
		items = $.getItemsById($.sndxIndex[sndx]);
	}
	if(country){
		var tmp = [];
		for(var i in items){
			if(items[i].country === country){
				if(region){
					if(items[i].region === region){
						tmp.push(items[i]);
					}
				}
				else{
					tmp.push(items[i]);
				}
			}
		}
		items = tmp;
	}
	else if(region){
		var tmp = [];
		for(var i in items){
			if(items[i].region === region){
				tmp.push(items[i]);
			}
		}
		items = tmp;
	}
	
	return(items);
}

$.getCitiesWithinRadius = function(city,dist){
	var d = $.distIndex[parseInt(city.id)];
	var ar = [];
	for(var i in d){
		if(parseFloat(i)<dist){
			console.log(true);
			ar = ar.concat(d[i]);
		}
		else{
			ar = ar.concat(d[i]);
			break;
		}
	}
	console.log(ar);
	var retAr = [];
	for(var i in ar){
		if(ar[i].dist <= dist){
			retAr.push(parseInt(ar[i].id));
		}
	}
	
	return $.getItemsById(retAr);
}

$.getDistanceBetweenCities = function(city1,city2){
	city1 = $.getCityByText(city1);
	city2 = $.getCityByText(city2);
	if(city1.length>0 && city2.length>0){
		city1 = city1[0];
		city2 = city2[0];
		return getDistance({latitude:city1.lat,longitude:city1.long},{latitude:city2.lat,longitude:city2.long},2);
	}
	else{
		return -1;
	}
}


$.index();
module.exports = $;