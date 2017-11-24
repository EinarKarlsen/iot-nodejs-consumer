// Interface for accessing db2

/*require the ibm_db module*/
var ibmdb = require('ibm_db');
var format = require("string-template");
var util = require("util");

exports.createSQLInsertStatement = function (dbtable,deviceId,deviceType,payload,datevalue) {

      var sql_insert_stmt = format("INSERT INTO {dbtable} (DEVICEID,DEVICETYPE,MOTORTEMP,CABINSPEED,CABINTEMP,CURRENTFLOOR,DIRECTION,DOOROPEN,LOAD,MAINTENANCEREASON,MAINTENANCESTOP,NUMBEROFFLOORS,STATE,DATEVALUE) VALUES ('{deviceid}', '{deviceType}','{motorTemp}','{cabinSpeed}','{cabinTemp}','{currentFloor}','{direction}','{doorOpen}','{load}','{maintenanceReason}','{maintenanceStop}','{numberOfFloors}', '{state}','{datevalue}');", {
          dbtable : dbtable,
          deviceid : deviceId,
          deviceType : deviceType,
          motorTemp : payload.motorTemp,
          cabinSpeed : payload.cabinSpeed,
          cabinTemp : payload.cabinTemp,
          currentFloor : payload.currentFloor,
          direction : payload.direction,
          doorOpen :  (payload.doorOpen == 'false') ? 0 : 1,
          load : payload.load,
          maintenanceReason : payload.maintenanceReason,
          maintenanceStop : (payload.maintenanceStop == true) ? 1 : 0 ,
          numberOfFloors : payload.numberOfFloors,
          state : payload.state,
          datevalue : datevalue
      });

      return sql_insert_stmt;
  }

 exports.createSQLMergeStatement = function (dbtable,deviceId,deviceType,payload,datevalue) {

      var mapping = {
          dbtable : dbtable,
          columns : "DEVICEID,DEVICETYPE,MOTORTEMP,CABINSPEED,CABINTEMP,CURRENTFLOOR,DIRECTION,DOOROPEN,LOAD,MAINTENANCEREASON,MAINTENANCESTOP,NUMBEROFFLOORS,STATE,TIMESTAMP,DATEVALUE",
          t2columns : "t2.DEVICEID,t2.DEVICETYPE,t2.MOTORTEMP,t2.CABINSPEED,t2.CABINTEMP,t2.CURRENTFLOOR,t2.DIRECTION,t2.DOOROPEN,t2.LOAD,t2.MAINTENANCEREASON,t2.MAINTENANCESTOP,t2.NUMBEROFFLOORS,t2.STATE,t2.TIMESTAMP,t2.DATEVALUE",
          values : "'{deviceid}', '{deviceType}','{motorTemp}','{cabinSpeed}','{cabinTemp}','{currentFloor}','{direction}','{doorOpen}','{load}','{maintenanceReason}','{maintenanceStop}','{numberOfFloors}', '{state}','{timestamp}','{datevalue}'",
          deviceid : deviceId,
          deviceType : deviceType,
          motorTemp : payload.motorTemp,
          cabinSpeed : payload.cabinSpeed,
          cabinTemp : payload.cabinTemp,
          currentFloor : payload.currentFloor,
          direction : payload.direction,
          doorOpen :  (payload.doorOpen == 'false') ? 0 : 1,
          load : payload.load,
          maintenanceReason : payload.maintenanceReason,
          maintenanceStop : (payload.maintenanceStop == true) ? 1 : 0 ,
          numberOfFloors : payload.numberOfFloors,
          state : payload.state,
          datevalue : payload.timestamp,
          timestamp : new Date(payload.timestamp).toISOString()
      };

      var raw_stmt =  "MERGE INTO {dbtable} AS t1 \n" +
                      "USING (SELECT * FROM TABLE (VALUES ({values}))) AS t2({columns}) \n" +
                      "ON (t1.DEVICEID =t2.DEVICEID) \n" +
                      "WHEN MATCHED AND t1.DATEVALUE < t2.DATEVALUE THEN \n" +
                          "UPDATE SET \n" +
                          "({columns}) = ({t2columns}) \n" +
                      "WHEN MATCHED AND t1.DATEVALUE >= t2.DATEVALUE THEN \n" +
                          "UPDATE SET \n" +
                              "t1.DATEVALUE = t1.DATEVALUE \n" +
                      "WHEN NOT MATCHED THEN \n" +
                              "INSERT ({columns}) VALUES ({t2columns}) \n" +
                      "ELSE IGNORE; \n";

      var sql_merge_stmt1 = format(raw_stmt,mapping);
      var sql_merge_stmt2 = format(sql_merge_stmt1,mapping);

      return sql_merge_stmt2;
  }
// Generic function for executing SQL statement
exports.executeSQLStatement = function (dbconnection,deviceId,sql_insert_stmt) {
      /* Connect to the database */
      ibmdb.open(dbconnection, function(err, conn) {
          if (err) {
              console.error("error: ", err.message);
          }
          else {
              /* Submit query */
              conn.query(sql_insert_stmt, function(err, events, moreResultSets) {
                  if (err) {
                      console.error("error: ", err.message);
                  }
                  else {
                      console.log('Record Inserted for ' + deviceId);
                  }
                  conn.close(function() {
                  });
              });
          }
      });
  }

  // For testing sql statement:
//   var payload = {"motorTemp":152.62160000000068,  "currentFloor":2,"doorOpen":false,"state":"moving","numberOfFloors":6,"cabinTemp":90,"cabinSpeed":0,  "direction":-1,"load":210,"maintenanceStop":false,"maintenanceReason":"","curtainOfLightBreak":0,"cleanessOfFloor":1,"timestamp": 1509443166243}
//   var now = new Date();
//   console.log(this.createSQLMergeStatement("myschema.mydb",'Test','Elevator',payload,now.valueOf()));
