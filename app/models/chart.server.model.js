'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var ChartSchema = new Schema({
	identifier: {
		type:String
	},
	datasetid:{
		type:String
	},
	xAxis:{
		type:String
	},
	yAxes:{
		type:Array
	},
	config:{}
});

mongoose.model('Chart', ChartSchema);