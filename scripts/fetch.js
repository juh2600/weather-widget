const api_base = 'http://api.openweathermap.org/data/2.5';
const units = 'imperial';

const sample_query = 'Salt Lake City';

const wind_precision = 2;

const buildRequest = (api_base, api_branch, query, api_key) => {
    return `${api_base}/${api_branch}?${query}&units=${units}&appid=${api_key}`;
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
    document.getElementById('search').value = '';
    document.activeElement.blur();
    let status = document.getElementById('search-status');
    status.innerHTML = '';
    status.classList.remove('error');
    document.getElementsByTagName('title')[0].innerHTML = `Weather: ${data.city.name}`;
    document.getElementById('parsed-query-pretty').innerHTML = `<a class="plain" href="https://google.com/maps/@${data.city.coord.lat},${data.city.coord.lon},9z" target="_blank">${data.city.name}, ${data.city.country}</a>`;

    let days = partitionDates(data);

    let content = '';
    let overview = document.getElementById('overview-container');

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
                    <input type="checkbox" id="day${counter}" class="hidden" />
                    <label for="day${counter}" class="day-overview">
                        <span class="relative-day">${todayTomorrowDayName}</span>
                        <span class="weather-data">
                            <span class="condition">${getIcon(mainRecord)}
                                <span class="condition-caption">${mainRecord.weather[0].main}</span>
                            </span>
                            <span class="temp-wind-container">
                                <span class="temp">${Math.round(mainRecord.main.temp)}&nbsp;&deg;F</span>
                                <span class="wind">${Math.round(mainRecord.wind.speed)}&nbsp;mi/h</span>
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
                        <span class="temp">${Math.round(record.main.temp)}&nbsp;&deg;F</span>
                        <span class="wind">${Math.round(record.wind.speed)}&nbsp;mi/h&nbsp;${convertAzimuthToCardinal(record.wind.deg, wind_precision)}</span>
                    </span>
                </span>
            </li>`;
        }
        content += `</ul>`;
    }
    overview.innerHTML = content;

    let theme = determineOptimalTheme(data.list);
    applyTheme(theme);
};

const search = (query) => {
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
    console.log('Use applyTheme(themeName) to force another theme, where themeName is one of the names listed above')
};

document.addEventListener('DOMContentLoaded', (evt) => {
    populateThemes();
    applyTheme('unimplemented');
    let initialQuery = Object.assign({}, { q: sample_query }, parseGETArguments(location.search)).q;
    search(detectQueryType(initialQuery));
    document.getElementById('search').addEventListener('keypress', (evt) => {
        if (evt.key === "Enter") searchFromBox(evt);
    });
    consoleHelp();
});
