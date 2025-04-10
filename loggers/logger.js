const LEVELS = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

const priority = LEVELS.reduce(
    (accumulator, level, index) => Object.assign(accumulator, { [level]: index }),
    {}
);

class Logger {
    constructor(minimalLogLevel = 'warn') {
        this.minimalLogLevel = minimalLogLevel;
    }

    shouldSkip(level) {
        return priority[level] < priority[this.minimalLogLevel];
    }

    setMinimalLogLevel(minimalLogLevel) {
        this.minimalLogLevel = minimalLogLevel;
    }

    /* eslint-disable no-console */
    fatal(...rest) {
        if (this.shouldSkip('fatal')) return;
        console.error(...rest);
    }

    error(...rest) {
        if (this.shouldSkip('error')) return;
        console.error(...rest);
    }

    warn(...rest) {
        if (this.shouldSkip('warn')) return;
        console.warn(...rest);
    }

    info(...rest) {
        if (this.shouldSkip('info')) return;
        console.info(...rest);
    }

    debug(...rest) {
        if (this.shouldSkip('debug')) return;
        console.log(...rest);
    }

    trace(...rest) {
        if (this.shouldSkip('trace')) return;
        console.log(...rest);
    }
    /* eslint-enable no-console */
}

module.exports = Logger;