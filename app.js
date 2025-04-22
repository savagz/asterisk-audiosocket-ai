var cookieParser = require("cookie-parser");
var createError = require("http-errors");
var express = require("express");
var logger = require("morgan");
var path = require("path");

const net = require("net");
const cluster = require("cluster");
const os = require("os");

require("dotenv").config();

// TOTAL CPUs
const numCPUs =
  os.cpus().length > 2 ? (os.cpus().length / 2).toFixed(0) : os.cpus().length;

// Routes Files
var indexRouter = require("./routes/index");
var webhookRouter = require("./routes/webhook");

// const AudioServer = require("./socket/AudioSocket");

// Express App
var app = express();

// View Engine Setup
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "jade");

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Routes
app.use("/", indexRouter);
app.use("/webhook", webhookRouter);

var provider = process.env.PROVIDER || "AZURE";

// Socket Server Google
if (provider === "GOOGLE") {
  const { handleSocketGoogle } = require("./socket/socket_google");
  const socketServerGoogle = net.createServer(handleSocketGoogle);

  const PORTGOOGLE = process.env.SOCKET_PORT || 5001;
  socketServerGoogle.listen(PORTGOOGLE, () => {
    console.log(`(GOOGLE) [${process.pid}] Socket Server Running on Port : ${PORTGOOGLE}`);
  });

  //Socket Server Azure
} else if (provider === "AZURE") {
  const { handleSocketAzure } = require("./socket/socket_azure");
  const socketServerAzure = net.createServer(handleSocketAzure);

  const PORTAZURE = process.env.SOCKET_PORT || 5001;
  socketServerAzure.listen(PORTAZURE, () => {
    console.log(`(AZURE) [${process.pid}] Socket Server Running on Port : ${PORTAZURE}`);
  });

  //Socket Server AWS
} else if (provider === "AWS") {
  const { handleSocketAws } = require("./socket/socket_aws");
  const socketServerAws = net.createServer(handleSocketAws);

  const PORTAWS = process.env.SOCKET_PORT || 5001;
  socketServerAws.listen(PORTAWS, () => {
    console.log(`(AWS) [${process.pid}] Socket Server Running on Port : ${PORTAWS}`);
  });
}

// Test AUDIOSOCKET (Not Used)
// const audioServer = new AudioServer(process.env.PORTAZURE || 5001);
// audioServer.start();

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
