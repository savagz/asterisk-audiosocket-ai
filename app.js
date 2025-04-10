var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const net = require("net");

var indexRouter = require('./routes/index');
var webhookRouter = require('./routes/webhook');

const AudioServer = require("./socket/AudioSocket");

// const { handleSocketGoogle } = require("./socket/socket_google");
const { handleSocketAzure } = require("./socket/socket_azure");
// const { handleSocketAzure } = require("./socket/AudioSocket");

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/webhook', webhookRouter);

// // Socket Server Google
// const socketServerGoogle = net.createServer(handleSocketGoogle);

// const PORT = process.env.PORT || 5002;
// socketServerGoogle.listen(PORT, () => {
//   console.log(`(GOOGLE) Socket Server Running on Port : ${PORT}`);
// });

//Socket Server Azure
const socketServerAzure = net.createServer(handleSocketAzure);

const PORTAZURE = process.env.PORTAZURE || 5001;
socketServerAzure.listen(PORTAZURE, () => {
  console.log(`(AZURE) Socket Server Running on Port : ${PORTAZURE}`);
});

// const audioServer = new AudioServer(process.env.PORTAZURE || 5001);
// audioServer.start();

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
