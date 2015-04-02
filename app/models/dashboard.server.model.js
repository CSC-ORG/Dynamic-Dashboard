'use strict';

var mongoose = require('mongoose'),
	Schema = mongoose.Schema;

var DashboardSchema = new Schema({
	created:{
		type: Date,
		default: Date.now
	},
	title:{
		type: String
	},
	description:{
		type: String
	},
	updated:{
		type: Date
	},
	source:{
		type:{
			type: String
		},
		identifier:{
			type: String
		}
	},
	charts:[{
		type: Schema.ObjectId,
		ref: 'Chart'
	}],
	admins:[{
		type: Schema.ObjectId,
		ref: 'User'
	}],
	monitors:[{
		type: Schema.ObjectId,
		ref: 'User'
	}]
});

mongoose.model('Dashboard', DashboardSchema);