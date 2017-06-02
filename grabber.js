var LWO_URL = "https://api.flightradar24.com/common/v1/airport.json?code=lwo";//&token=GsQU-D3kungjoCc3yrdp-cq2Vvu48iIu3UNSaNry8go
//&plugin%5Bschedule%5D=schedule&plugin-setting%5Bschedule%5D%5Bmode%5D=arrivals&page=-1
var cheerio = require('cheerio');
var request = require('request');
var fs = require('fs');
var storage = require('node-persist');
var moment = require('moment');



function initAndRun() {
  storage.initSync();
  console.log("Loadind FR24 data.");
  request(LWO_URL, function (error, response, json) {
    if (!error && response.statusCode == 200) {
      console.log("Done!");
      //console.log(json);
      var data = JSON.parse(json);
      //console.log(data.result.response.airport.pluginData.schedule);
      var schedule = data.result.response.airport.pluginData.schedule;
      processFlights(schedule.arrivals.data);
      processFlights(schedule.departures.data);
      console.log("DONE!!!")
      writeTsv();
    }
    else {
      throw error;
    }
  });
}

function processFlights(flights) {
  for(var i in flights) {
    var flight = flights[i].flight;
    console.log(flight);
    console.log(flight.time);
    var key = flight.time.scheduled.departure + "-" + flight.identification.number.default;
    console.log("Key: " + key);
    storage.setItemSync(key, flight);
  }
}

function writeTsv() {
  var wstream = fs.createWriteStream('flights.tsv');
  console.log("Reading from database...");
  var values = storage.values();
  for(var i in values) {
    console.log(values[i].identification.number.default);
    var args = [];
    var inbound = values[i].airport.destination.code == null ? true : false;
    var ts = inbound ? values[i].time.scheduled.arrival : values[i].time.scheduled.departure;
    args.push(moment(new Date(ts*1000)).format());
    args.push(values[i].identification.number.default);
    args.push(values[i].airline == null ? "" : values[i].airline.code.iata);
    args.push(values[i].aircraft == null ? "" : values[i].aircraft.model.code);
    args.push(inbound ? values[i].airport.origin.code.iata : values[i].airport.destination.code.iata);
    args.push(inbound ? "IN" : "OUT");
    appendTsvLine(wstream, args);
  }
  wstream.end();
}

function appendTsvLine(wstream, args) {
  for(var i = 0; i < args.length; i++) {
    wstream.write(args[i]);
    wstream.write("\t");
  }
  wstream.write("\n");
}

initAndRun();