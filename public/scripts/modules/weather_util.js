import * as Util from './util.js';
import * as Icons from './icons.js';

export const getMostInterestingCondition = (conditions) => {
	let best = 'clear';
	conditions = conditions.map(c => c.toLocaleLowerCase());
	// conditions later in the following list have higher priority
	[
		'mist', 'haze', 'fog', 'sand', 'dust', 'smoke',
		'ash', 'squall', 'tornado', 'clear', 'clouds',
		'drizzle', 'rain', 'snow', 'thunderstorm'
	].forEach(condition => {
		if(conditions.includes(condition)) best = condition;
	});
	return Util.capitalizeFirst(best);
};

export const getIcon = (record) => {
	switch (record.weather.short.toLocaleLowerCase()) {
		case 'thunderstorm':
		case 'thunderstorms':
			return Icons.cloud_lightning;
		case 'drizzle':
		case 'rain':
			return Icons.cloud_rain;
		case 'snow':
			return Icons.cloud_snow;
		case 'clouds':
		case 'cloudy':
		case 'cloud':
			return Icons.cloud;
		case 'clear':
			console.log('Getting icon:',record.time);
			return record.time.daytime ? Icons.sun : Icons.moon;
		default: return '';
	}
}

export const convertAzimuthToCardinal = (azimuth, precision = 3) => {
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

export const determineOptimalTheme = (current, forecast) => {
	switch(current.weather.short) {
		case 'Thunderstorm':
		case 'Drizzle':
		case 'Rain':
		case 'Snow':
		case 'Clouds':
			return currentState.main.toLowerCase();
		case 'Clear':
			return `clear-${current.time.daytime?'day':'night'})}`;
		default:
			return 'unimplemented';
	}
};

export const getSpeedUnit = (units) => {
	switch(units) {
		case 'imperial': return 'mi/h';
		case 'metric': return 'km/h';
		case 'si':
		default: return 'm/s';
	}
};

export const getTempUnit = (units) => {
	switch(units) {
		case 'imperial': return '&deg;F';
		case 'metric': return '&deg;C';
		case 'si':
		default: return 'K';
	}
};
