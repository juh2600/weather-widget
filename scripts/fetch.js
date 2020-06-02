const api_base = 'https://api.openweathermap.org/data/2.5';
let units = 'imperial';

let lastQuery = 'Salt Lake City';
let lastQueryBak = lastQuery;
let dayExpansionStates = null;

const default_wind_precision = 2;

const buildRequest = (api_base, api_branch, query, api_key) => {
	return `${api_base}/${api_branch}?${query}&units=${units||''}&appid=${api_key}`;
};

const buildForecastRequest = (query) => {
	return buildRequest(api_base, 'forecast', query, api_key);
};

const fetchData = (url, callback) => {
	fetch(url)
		.then(response => response.json())
		.then(data => {
			if (~~(data.cod) >= 400) throw data;
			// console.log(data);
			callback(data);
		})
		.catch(handleFetchError);
};

const handleFetchError = (err) => {
	console.log("Error: ", err);
	lastQuery = lastQueryBak;
	if (~~(err.cod) == 404) {
		let status = document.getElementById('search-status');
		status.innerHTML = 'Location not found';
		status.classList.add('error');
	}
}

// adjusts timestamps to reflect query's local time and returns data
// partitioned by day
const partitionDates = (data) => {
	let tz = data.city.timezone;
	for (let index = 0; index < data.list.length; index++) {
		let date = new Date(data.list[index].dt_txt + 'Z');
		date.setHours(date.getHours() + Math.floor(tz / 60 / 60));
		date.setMinutes(date.getMinutes() + Math.floor(tz / 60) % 60);
		data.list[index].dt_txt = date.toISOString();
		// at this point, the timestamp on the record has been adjusted to local time
		// unfortunately this local time is stored where the computer expects to find
		// a UTC time, but given the limitations of the Date object, we'll have to
		// live with it
	}
	let days = [];
	days.today = getDay(data.list[0]);
	for (let index in data.list) {
		let day = getDay(data.list[index]);
		if (days[day] == undefined) days[day] = [];
		days[day].push(data.list[index]);
	}
	return days;
};

const populateThemes = () => {
	document.getElementsByTagName('head')[0].innerHTML += '<style id="theme-rules"></style>';
	let rules = document.getElementById('theme-rules');
	for (let theme in themes) {
		console.log('Adding theme: ' + theme);
		let t = themes[theme];
		let themeStyles = `
		body.theme-${theme} {
			background-image: ${removeUndefined([t['background']['gradient'], t['background']['image']]).join(', ')};
			color: ${t['color']};
		}
		body.theme-${theme} input {
			color: ${t['color']};
		}
		body.theme-${theme} #search-status.error {
			color: ${t['search']['error-color']};
		}
		body.theme-${theme} #search-container {
			border-image: linear-gradient(to right, ${t['search']['border']}, transparent) 1;
		}
		body.theme-${theme} #search::placeholder {
			color: ${t['search']['color']};
		}
		body.theme-${theme} input[type="radio"]:checked + label {
			background-color: ${t['unit-selector']['selected']};
		}
		body.theme-${theme} input[type="radio"] + label:hover {
			background-color: ${t['unit-selector']['hover']};
		}
		@media all and (min-width: 55em) {
			body.theme-${theme} li.day-overview, body.theme-${theme} li.period-breakdown {
				background-color: ${t['desktop']['tile-color']};
			}
		}
		`;
		rules.innerHTML += themeStyles;
		// rules.sheet.insertRule(bgImage);
		// rules.sheet.insertRule(`background-image: ${[theme['background-gradient'], theme['background-image']].join(', ')}`)
	}
};

const applyTheme = (theme) => {
	console.log('Theme: ' + theme);
	let body = document.getElementsByTagName('body')[0];
	for (let t in themes) {
		body.classList.remove(`theme-${t}`);
	}
	if (!themes[theme]) theme = 'unimplemented';
	body.classList.add(`theme-${theme}`);
	if (themes[theme].mobile && themes[theme].mobile['status-bar'])
		document.getElementById('mobile-status-bar-color').content = themes[theme].mobile['status-bar'];
};

const summarizeRecords = (records) => {
	let summary = {
		"weather": [{
			// "id": undefined,
			"main": undefined,
			"icon": "d"
		}],
		"main": {
			"temp": undefined
		},
		"wind": {
			"speed": undefined
		}
	};
	if(records && records.length > 0) {
		let temp = 0;
		for(let i in records) temp += records[i].main.temp;
		temp /= records.length;
		summary.main.temp = temp;
		let windSpeed = 0;
		for(let i in records) windSpeed += records[i].wind.speed;
		windSpeed /= records.length;
		summary.wind.speed = windSpeed;
		let condition = '';
		let conditions = records.map((record) => record.weather[0].main);
		if(conditions.includes('Mist')) condition = 'Mist';
		if(conditions.includes('Haze')) condition = 'Haze';
		if(conditions.includes('Fog')) condition = 'Fog';
		if(conditions.includes('Sand')) condition = 'Sand';
		if(conditions.includes('Dust')) condition = 'Dust';
		if(conditions.includes('Dust')) condition = 'Dust';
		if(conditions.includes('Smoke')) condition = 'Smoke';
		if(conditions.includes('Ash')) condition = 'Ash';
		if(conditions.includes('Squall')) condition = 'Squall';
		if(conditions.includes('Tornado')) condition = 'Tornado';
		// if we can assign one that we have an icon for, do that
		if(conditions.includes('Clear')) condition = 'Clear';
		if(conditions.includes('Clouds')) condition = 'Clouds';
		if(conditions.includes('Drizzle')) condition = 'Drizzle';
		if(conditions.includes('Rain')) condition = 'Rain';
		if(conditions.includes('Snow')) condition = 'Snow';
		if(conditions.includes('Thunderstorm')) condition = 'Thunderstorm';
		summary.weather[0].main = condition;
	} else {
		return null;
	}
	return summary;
};

const populateView = (data) => {
	dayExpansionStates = getDayExpansionStates();
	document.getElementById('search').value = '';
	document.activeElement.blur();
	let status = document.getElementById('search-status');
	status.innerHTML = '';
	status.classList.remove('error');
	document.getElementsByTagName('title')[0].innerHTML = `Weather: ${data.city.name}`;
	document.getElementById('parsed-query-pretty').innerHTML = `<a class="plain" href="https://google.com/maps/@${data.city.coord.lat},${data.city.coord.lon},9z" target="_blank">${data.city.name}${data.city.country?', '+data.city.country:''}</a>`;

	let days = partitionDates(data);

	let content = '';
	let overview = document.getElementById('overview-container');

	if(units === 'metric') { // convert wind speed from m/s to km/h
		for(let index = 0; index < data.list.length; index++) {
			data.list[index].wind.speed *= 3600/1000; // 3600 s/1 h * 1 km/1000 m
		}
	}

	let counter = 0;
	for (let index = days.today; counter === 0 || index != days.today; index = (index + 1) % 7) {
		let records = days[index];
		if (records == undefined) continue;
		let todayTomorrowDayName = getTodayTomorrowDayName(index, counter);
		counter++;

		// populate overview
		let daytimeRecords = getDaytimeRecords(days[index]);
		let mainRecord = summarizeRecords(daytimeRecords) || days[index][0];
		content += `
			<li class="day-overview">
			<input type="checkbox" id="day${counter}" class="hidden day-expansion" />
			<label for="day${counter}" class="day-overview">
			<span class="relative-day">${todayTomorrowDayName}</span>
			<span class="weather-data">
			<span class="condition">${getIcon(mainRecord)}
			<span class="condition-caption">${mainRecord.weather[0].main}</span>
			</span>
			<span class="temp-wind-container">
			<span class="temp">${Math.round(mainRecord.main.temp)}&nbsp;${getTempUnit(units)}</span>
			<span class="wind">${Math.round(mainRecord.wind.speed)}&nbsp;${getSpeedUnit(units)}</span>
			</span>
			</span>
			</label>
			<ul class="plain day-breakdown">`;
		for (let period = 0; period < days[index].length; period++) {
			let record = days[index][period];
			let date = new Date(record.dt_txt);
			content += `
				<li class="period-breakdown">
				<span class="time">${(date.getUTCHours() + '').padStart(2, '0')}:${(date.getUTCMinutes() + '').padStart(2, '0')}</span>
				<span class="weather-data">
				<span class="condition">
				<span class="reset-font-size">${getIcon(record)}</span>
				<span class="condition-caption">${record.weather[0].main}</span>
				</span>
				<span class="temp-wind-container">
				<span class="temp">${Math.round(record.main.temp)}&nbsp;${getTempUnit(units)}</span>
				<span class="wind">${Math.round(record.wind.speed)}&nbsp;${getSpeedUnit(units)}&nbsp;${convertAzimuthToCardinal(record.wind.deg, default_wind_precision)}</span>
				</span>
				</span>
				</li>`;
		}
		content += `</ul>`;
	}
	overview.innerHTML = content;

	let theme = determineOptimalTheme(data.list);
	applyTheme(theme);
	if(dayExpansionStates) setDayExpansionStates(dayExpansionStates);
	lastQueryBak = lastQuery;
};

const search = (query) => {
	lastQuery = query;
	console.log('Requesting weather for ' + query);
	if (query == 'q=undefined' || query == 'q=' || query == '' || query == 'q=null' || !query) {
		document.getElementById('search-status').innerHTML = '';
	} else fetchData(buildForecastRequest(query), populateView);
};

const detectQueryType = (query) => {
	let attempt;
	if (attempt = parseAsZip(query)) return `zip=${attempt}`;
	// otherwise, handle as a city name
	return `q=${parseAsCity(query)}`;
};

// TODO specialize by city, zip, etc.
	// see https://openweathermap.org/forecast5
const searchFromBox = (evt) => {
	var query = document.getElementById('search').value;
	if (query) search(detectQueryType(query));
};

const consoleHelp = () => {
	console.log('Things to try:');
	console.log(' - Resize the page: it\'s responsive, with full feature parity between mobile and desktop views');
	console.log(' - Search for Athens');
	console.log(' - Search for Athens, US (it\'s in Georgia)');
	console.log(' - Search for your ZIP code');
	console.log(' - Search for somewhere that doesn\'t exist');
	console.log(' - Append q= with a query string to the URL to specify the default search');
	console.log(' - Append u= with one of {imperial|metric|si} to specify the default search');
	console.log(' - Not sure which Springfield you\'re looking at? Click the name of the city to view it in Google Maps');
	console.log(' - Click the daily summaries to toggle 3-hour breakdowns');
	console.log(' - Use applyTheme(themeName) to force another theme, where themeName is one of the names listed above (or good luck collecting places with the right weather to try them all out)');
};

const reloadInPlace = () => {
	search(lastQuery);
};

document.addEventListener('DOMContentLoaded', (evt) => {
	populateThemes();
	applyTheme('unimplemented');
	document.getElementById('imperial').addEventListener('change', () => {units = 'imperial'; reloadInPlace();});
	document.getElementById('metric'  ).addEventListener('change', () => {units = 'metric'  ; reloadInPlace();});
	document.getElementById('si'      ).addEventListener('change', () => {units = 'si'      ; reloadInPlace();});
	let initialValues = Object.assign({}, { q: lastQuery, u: units }, parseGETArguments(location.search));
	let initialQuery = initialValues.q;
	let initialUnits = initialValues.u.toLocaleLowerCase();
	let unitElement = document.getElementById(initialUnits) || document.getElementById('imperial');
	unitElement.checked = true;
	units = unitElement.value;
	search(detectQueryType(initialQuery));
	document.getElementById('search').addEventListener('keypress', (evt) => {
		if (evt.key === "Enter") searchFromBox(evt);
	});
	consoleHelp();
});
