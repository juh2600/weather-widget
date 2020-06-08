const getDayOrNight = (record) => {
	return record.weather[0].icon.substr(-1, 1) == 'n' ? 'night' : 'day';
};

const getDaytimeRecords = (records) => {
	return records.filter((record) => getDayOrNight(record)=='day');
}

// https://openweathermap.org/weather-conditions
const getIcon = (record) => {
	switch (record.weather[0].id || record.weather[0].main) {
		case 200:
		case 201:
		case 202:
		case 210:
		case 211:
		case 212:
		case 221:
		case 230:
		case 231:
		case 232:
		case 'Thunderstorm':
		case 'Thunderstorms':
		case 'thunderstorm':
		case 'thunderstorms':
			return cloud_lightning;
		case 300:
		case 301:
		case 302:
		case 310:
		case 311:
		case 312:
		case 313:
		case 314:
		case 321:
		case 500:
		case 501:
		case 502:
		case 503:
		case 504:
		case 520:
		case 521:
		case 522:
		case 531:
		case 'Drizzle':
		case 'drizzle':
		case 'Rain':
		case 'rain':
			return cloud_rain;
		case 511: // freezing rain
		case 600:
		case 601:
		case 602:
		case 611:
		case 612:
		case 613:
		case 615:
		case 616:
		case 620:
		case 621:
		case 622:
		case 'Snow':
		case 'snow':
			return cloud_snow;
		case 701:
		case 741:
		case 771:
		case 781:
		case 801:
		case 802:
		case 803:
		case 804:
		case 'Clouds':
		case 'clouds':
		case 'Cloudy':
		case 'cloudy':
			return cloud;
		case 800:
		case 'Clear':
		case 'clear':
			return getDayOrNight(record) == 'night' ? moon : sun;
		case 711:
		case 721:
		case 731:
		case 751:
		case 761:
		case 762:
		default: return '';
	}
}

const getDay = (record) => {
	return (new Date(record.dt_txt)).getUTCDay();
};

const getDayName = (i) => {
	switch (i) {
		case 0: return 'Sunday';
		case 1: return 'Monday';
		case 2: return 'Tuesday';
		case 3: return 'Wednesday';
		case 4: return 'Thursday';
		case 5: return 'Friday';
		case 6: return 'Saturday';
		default: return 'Day';
	}
}

/**
	* Get either 'Today', 'Tomorrow', or the name of a day.
	* @param {*} i Index of the day of the week.
	* @param {*} counter If this is 0, return 'Today'. If it is 1, return 'Tomorrow'. Otherwise, return the name of the day.
	*/
	const getTodayTomorrowDayName = (i, counter) => {
		if (counter === 0) return 'Today';
		if (counter === 1) return 'Tomorrow';
		return getDayName(i);
	}

const convertAzimuthToCardinal = (azimuth, precision = 3) => {
	const whole = 360;
	const quadrant = whole/4;
	const octant = quadrant/2
	const sixteenth = octant/2;
	switch(precision) {
		case 1:
			azimuth = (azimuth + quadrant/2) % whole;
			if(azimuth < 1*quadrant) return 'N';
			if(azimuth < 2*quadrant) return 'E';
			if(azimuth < 3*quadrant) return 'S';
			if(azimuth < 4*quadrant) return 'W';
		case 2:
			azimuth = (azimuth + octant/2) % whole;
			if(azimuth < 1*octant) return 'N';
			if(azimuth < 2*octant) return 'NE';
			if(azimuth < 3*octant) return 'E';
			if(azimuth < 4*octant) return 'SE';
			if(azimuth < 5*octant) return 'S';
			if(azimuth < 6*octant) return 'SW';
			if(azimuth < 7*octant) return 'W';
			if(azimuth < 8*octant) return 'NW';
		case 3:
			azimuth = (azimuth + sixteenth/2) % whole;
			if(azimuth < 1*sixteenth) return 'N';
			if(azimuth < 2*sixteenth) return 'NNE';
			if(azimuth < 3*sixteenth) return 'NE';
			if(azimuth < 4*sixteenth) return 'ENE';
			if(azimuth < 5*sixteenth) return 'E';
			if(azimuth < 6*sixteenth) return 'ESE';
			if(azimuth < 7*sixteenth) return 'SE';
			if(azimuth < 8*sixteenth) return 'SSE';
			if(azimuth < 9*sixteenth) return 'S';
			if(azimuth < 10*sixteenth) return 'SSW';
			if(azimuth < 11*sixteenth) return 'SW';
			if(azimuth < 12*sixteenth) return 'WSW';
			if(azimuth < 13*sixteenth) return 'W';
			if(azimuth < 14*sixteenth) return 'WNW';
			if(azimuth < 15*sixteenth) return 'NW';
			if(azimuth < 16*sixteenth) return 'NNW';
	}
	throw (azimuth + ' could not be converted to a cardinal direction with a precision of ' + precision);
};

const parseAsZip = (str) => {
	matches = str.match(/([0-9]{5})(-?[0-9]{4})?/);
	if(matches) return matches[1];
	return null;
}

const parseAsCity = (str) => {
	let arr = str.replace(/,/g, '').split(' ');
	let empty;
	while((empty = arr.indexOf('')) >= 0) arr.splice(empty);
	if(arr.length < 2) return arr[0];
	let last = arr.pop();
	if(last.length != 2) {
		return `${arr.join('+')}+${last}`;
	} // otherwise treat it as a country or state
	else if(arr.length < 2) return arr[0] + ',' + last;
	let nextToLast = arr.pop();
	if(nextToLast.length != 2) {
		return `${arr.join('+')}+${nextToLast},${last}`;
	} // at this point, they're a country and a state
	return `${arr.join('+')},${nextToLast},${last}`;
};

const determineOptimalTheme = (records) => {
	let currentState = records[0].weather[0];
	switch(currentState.main) {
		case 'Thunderstorm':
		case 'Drizzle':
		case 'Rain':
		case 'Snow':
		case 'Clouds':
			return currentState.main.toLowerCase();
		case 'Clear':
			return `clear-${getDayOrNight({weather:[currentState]})}`;
		default:
			return 'unimplemented';
	}
};

const removeValue = (arr, val) => {
	let tgt;
	while((tgt = arr.indexOf(val)) >= 0) arr.splice(tgt, 1);
	return arr;
}

const removeEmptyStrings = (arr) => { return removeValue(arr, ''); }

const removeUndefined = (arr) => { return removeValue(arr, undefined); }

const parseGETArguments = (str) => {
	let out = {};
	let get = removeEmptyStrings(str.split(/[&?]/));
	for(let i in get) {
		let pair = get[i].split('=');
		out[pair[0]] = decodeURIComponent(pair[1]);
	}
	return out;
}

const getSpeedUnit = (units) => {
	switch(units) {
		case 'imperial': return 'mi/h';
		case 'metric': return 'km/h';
		case 'si':
		default: return 'm/s';
	}
};

const getTempUnit = (units) => {
	switch(units) {
		case 'imperial': return '&deg;F';
		case 'metric': return '&deg;C';
		case 'si':
		default: return 'K';
	}
};

const getDayExpansionStates = () => {
	let boxes = document.getElementsByClassName('day-expansion');
	let states = [];
	for(let i = 0; i < boxes.length; i++) {
		states[i] = boxes[i].checked;
	}
	return states;
};

const setDayExpansionStates = (states) => {
	let boxes = document.getElementsByClassName('day-expansion');
	for(let i = 0; i < boxes.length; i++) {
		boxes[i].checked = states[i];
	}
};
