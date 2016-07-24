var gzippo = require('gzippo');
var express = require('express');
var morgan = require('morgan');
var app = express();

app.use(express.static(__dirname));

app.use(morgan('dev'));
app.use(gzippo.staticGzip("" + __dirname + "/index.html"));
app.listen(process.env.PORT || 5000);