export const mean = (arr) => {
	return arr.reduce((x,y)=>x+y)/arr.length;
};

export const capitalizeFirst = (string) => {
	return string[0].toLocaleUpperCase() + string.slice(1);
};

export const getDayName = (date) => {
	switch (date.getUTCDay()) {
		case 0: return 'Sunday';
		case 1: return 'Monday';
		case 2: return 'Tuesday';
		case 3: return 'Wednesday';
		case 4: return 'Thursday';
		case 5: return 'Friday';
		case 6: return 'Saturday';
		default: return 'Someday';
	}
};

// Use UTC date
export const getDate = (date) => {
	if(date.constructor.name !== 'Date') date = new Date(date);
	return new Date(date.toISOString().slice(0,10));
};

/*
export const getTime = (date) => {
	if(date.constructor.name !== 'Date') date = new Date(date);
	return new Date(date.getTime() / 1000 % (60 * 60 * 24) * 1000).getTime();
};
*/

// Use UTC time
export const getReadableTime = (date) => {
	return date.toISOString().slice(11,16);
};

export const getTodayTomorrowDayName = (date, today) => {
	// reset each date to midnight
	let then = getDate(date);
	let now = getDate(today);
	let difference = (then - now) / 1000 / 60 / 60 / 24; // diff in days
	if(difference == 0) return 'Today';
	if(difference == 1) return 'Tomorrow';
	return getDayName(date);
};

export const parseQueryString = (str) => {
	let out = {};
	let get = str.split(/[&?]/).filter(x => x); // remove empty strings
	for(let i in get) {
		let pair = get[i].split('=');
		out[pair[0]] = decodeURIComponent(pair[1]);
	}
	return out;
};

export const getDayExpansionStates = () => {
	let boxes = document.getElementsByClassName('day-expansion');
	let states = [];
	Object.keys(boxes).forEach(index => {
		states[index] = boxes[index].checked;
	});
	return states;
};

export const setDayExpansionStates = (states) => {
	let boxes = document.getElementsByClassName('day-expansion');
	Object.keys(boxes).forEach(index => {
		boxes[index].checked = states[index];
	});
};
