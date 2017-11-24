"use strict";

/* require dotenv */
const dotenv=require('dotenv');
dotenv.config();

/*require the ibm_db module*/
var ibmdb = require('ibm_db');
var format = require("string-template");
var util = require("util");

/* require cfenv */
var cfenv = require("cfenv");

// load local VCAP configuration  and service credentials
var vcapLocal;
try {
  vcapLocal = require('./vcap-local.json');
//  console.log("Loaded local VCAP", vcapLocal);
} catch (e) { }

const appEnvOpts = vcapLocal ? { vcap: vcapLocal} : {}

const appEnv = cfenv.getAppEnv(appEnvOpts);


// Configure IOT service using VCAP or ENV properties
var iot_credentials;
var iotconfiguration;
var dbconfiguration;

if (appEnv.services['iotf-service'] || appEnv.getService(/iotf-service/)) {
    iot_credentials = appEnv.services['iotf-service'][0].credentials;
//    console.log("Retrieved iot service credentials from vcap file");
    iotconfiguration = {
        "org": iot_credentials.org,
        "auth-key": iot_credentials.apiKey,
        "auth-token": iot_credentials.apiToken,
    }
} else if (process.env.IOTORG) {
    iotconfiguration = {
        "org": process.env.IOTORG,
        "auth-key": process.env.IOTAUTHKEY,
        "auth-token": process.env.IOTAUTHTOKEN
    }
//    console.log("Retrieved iot service credentials from .env file")
} else {
    console.log("Cloud not find iot service credentials")
}

iotconfiguration.id = "iotconsumer-elevator";
iotconfiguration.type ="shared";
//console.log(JSON.stringify(iotconfiguration));

// Configure DB service using VCAP or ENV properties

if (appEnv.services['dashDB'] || appEnv.getService(/dashDB/)) {
    dbconfiguration = appEnv.services['dashDB'][0].credentials;
//    console.log("Retrieved dashDB service credentials from vcap file");
//    console.log(JSON.stringify(dbconfiguration));
} else if (process.env.DATABASE) {
    dbconfiguration = {
        db : process.env.DATABASE,
        port   : process.env.DBPORT,
        username : process.env.DBUID,
        password : process.env.DBPWD,
        hostname: process.env.DBHOSTNAME
    };
//    console.log("Retrieved DB2 service credentials from .env file")
} else {
    console.log("Cloud not find DB2 service credentials")
}

dbconfiguration.table = process.env.DBTABLE;
dbconfiguration.driver = '{DB2}';
// console.log(JSON.stringify(dbconfiguration));

const db2 = require("./ibmdb2interface");

var dbconnection = format ("DRIVER={driver};DATABASE={db};UID={username};PWD={password};HOSTNAME={hostname};port={port}",dbconfiguration);
// console.log(JSON.stringify(dbconnection));

// only for health check
var http = require('http');
var server = http.createServer(function (request, response) {
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end("Hello World\n");
});

// Listen on port 8000 or Cloud provided Port
// this is only to enable frequent health checking in Containers or CF
var port = (process.env.PORT || 8000);
server.listen(port);

/*require iot platform*/
var client = require('ibmiotf');
var deviceType = "Elevator";

// Connect to IoT platform
var appClient = new client.IotfApplication(iotconfiguration);
appClient.connect();
appClient.on("connect", function () {
        console.log("Connected");
        appClient.subscribeToDeviceEvents(deviceType);
});

appClient.on("error", function () {
        console.error();('Could not connect to IOTF');
        process.exit();
});

// Read device event and save it to the database
appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
    var realPayload = JSON.parse(payload.toString());
    realPayload = realPayload.d;
    console.log(realPayload);

    var sql_stmt = db2.createSQLMergeStatement(dbconfiguration.table,deviceId,deviceType,realPayload);   //'2017-07-24T12:25:49.614Z'

    db2.executeSQLStatement(dbconnection,deviceId,sql_stmt);
});
