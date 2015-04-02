'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var SourceSchema = new Schema({
	columns:{
		type: Array
	},
	types:{
		type: Array
	},
	data: {},
	unique:{},
	identifier:{
		type: String
	},
	datasets:[
		{
			name: { type: String },
			filters: { type: Array }
		}
	]
});

mongoose.model('Source', SourceSchema);