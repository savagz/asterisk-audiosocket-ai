require("dotenv").config();

const Logger = require('../loggers/logger.js');

const infotransfer = {
    exten: "s",
    context: 'INFO',
    priority: 1
}

const TEMPLATE_AMI_CONFIG = {
    port: 5038,
    host: '',
    login: '',
    password: '',
    encoding: 'ascii',
}

const applogger = new Logger();

const appasterisk = {
    ...TEMPLATE_AMI_CONFIG,
    host: process.env.AMIHOST || "192.168.1.11",
    login: process.env.AMIUSER || "bextech", 
    password: process.env.AMIPASSWD || "q1w2e3r4t5"
};

module.exports = { appasterisk, applogger, infotransfer };