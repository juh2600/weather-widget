const LEVEL_SIZE = 12;

export const addLogLevel = (obj, level, output) => {
	output = output || console[level] || console.log;
	let levelPrefix = `[ ${level} ]`;
	while(levelPrefix.length < LEVEL_SIZE)
		levelPrefix += ' ';
	obj[level] = (message) => {
		output(`${levelPrefix}\t[ ${obj.role} ] ${message}`);
	};
};

export const get = (role, options = {}) => {
	let defaults = {
		levels: [
			{name: 'silly', output: console.trace},
			{name: 'trace'},
			{name: 'debug'},
			{name: 'error'},
			{name: 'warn'},
			{name: 'info'},
			{name: 'log'}
		]
	};
	let o = Object.assign({}, defaults, options);
	let logger = { role };
	o.levels.forEach(level => {
		addLogLevel(logger, level.name, level.output);
	});
	return logger;
};
