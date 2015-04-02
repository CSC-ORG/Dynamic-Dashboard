'use strict';

var mongoose = require('mongoose'),
	Dashboard = mongoose.model('Dashboard'),
	User = mongoose.model('User'),
	Source = mongoose.model('Source'),
	Chart = mongoose.model('Chart'),
	errorHandler = require('./errors.server.controller'),
	request = require('request'),
	redis = require('redis').createClient();


exports.create = function(req, res){
	var dash = new Dashboard(req.body.dashboard);
	dash.updated = Date.now();
	dash.admins.push(req.user.id);
	dash.save(function(err,doc){
		if (err) {
			res.status(500).send({
				message: errorHandler.getErrorMessage(err)
			});
		} else {
			var update = {dashboardId:doc._id,admin:true};
			User.findByIdAndUpdate(req.user.id,{$push:{dashboards: update},updated:Date.now()},function(err,user){
				if(err)
					res.status(500).json({'error':'Could not update user.'});
				else
					res.status(200).json({dashboardId:doc._id});
			});
			redis.get(doc.source.identifier,function(err,reply){
				var source = new Source(JSON.parse(reply));
				source.save();
			});
		}
	});
};

exports.get = function(req, res){
	
	Dashboard.findById(req.params.id).populate('charts').exec(function(err,doc){
		if(err)
			res.status(500).json({'error':'Could not find the document.'});
		else{
			Source.findOne({identifier:doc.source.identifier}, function(err,source){
				if(err) res.status(500).json({'error':'Could not find the document.'});
				redis.set(doc.source.identifier,JSON.stringify(source));
				res.status(200).json({'response':doc});
			});
		}
			
	});
};

exports.update = function(req, res){
	req.body.updated = Date.now();
	Dashboard.findByIdAndUpdate(req.params.id,req.body,function(err,doc){
		if(err)
			res.status(500).json({'error':'Could not update the dashboard.'});
		else
			res.status(200).send(doc);
	});
};

exports.addFile = function(req, res){
	if(req.body.type==='link'){
		request.post({url:'http://127.0.0.1:8000/valid/', form: req.body}, function(err, response, body){
			if(err) res.status(500).send('Some error occurred. Please try again.');
			else{
				res.status(200).send(body);
			}
		});
	}else if(req.body.type==='file'){
		console.log(req.body);console.log(req.files);
		var options = {
			type: req.body.type,
			extension: req.files.file.extension,
			identifier: req.files.file.name,
			path: req.files.file.path,
			mimetype: req.files.file.mimetype,
			size: req.files.file.size,
			sheetno: req.body.sheetno || null
		};
		request.post({url:'http://127.0.0.1:8000/valid/', form: options}, function(err, response, body){
			if(err) res.status(500).send('Some error occurred. Please try again.');
			else{
				res.status(200).send(body);
			}
		});
	}else{
		res.status(500).send('Kindly select a file or give a google spreadsheet link.');
	}
};

exports.addDataset = function(req, res){
	Source.findOneAndUpdate(
		{identifier:req.params.id},
		{
			$addToSet:{
				datasets:{name:req.body.name,filters:req.body.filters}
			}
		}, function(err, source){
		if (err) res.status(500).send('No source file exists or a failed update.');
		else{
			res.status(200).send('Dataset has been added.');
		}
	});
};

exports.getDatasets = function(req, res){
	Source.findOne({identifier:req.params.id},{'datasets.name':1,'datasets._id':1,columns:1},function(err,dataset){
		if (err) res.status(500).send('Could not find the source file.');
		else{
			res.status(200).json({"response":dataset});
		}
	});
};

exports.getAdmins = function(req, res){
	Dashboard.findOne({'source.identifier':req.params.id}).populate('admins monitors').exec(function(err,doc){
		if (err) res.status(500).send('Could not connect.');
		else{
			res.status(200).json({_id:doc._id,"admins":doc.admins,"monitors":doc.monitors});
		}
	});
};

exports.addAdmin = function(req, res){
 	if(req.body.admin==req.user.id||req.body.monitor==req.user.id)
 		res.status(500).send('You are already an admin of this dashboard.');
	else if(req.body.admin){
		Dashboard.findOneAndUpdate({'source.identifier':req.params.id},{$addToSet:{admins:req.body.admin}},function(err,doc){
			if (err) res.status(500).send('There was some problem with the server.');
			User.findOneAndUpdate({_id:req.body.admin},{$addToSet:{dashboards:{dashboardId:doc._id,admin:true}}},function(err,user){
				if(err) res.status(500).send('There was some problem with the server.');
				else
					res.status(200).json({"_id":user._id,"displayName":user.displayName,"email":user.email});
			});
		});
	}else if(req.body.monitor){
		Dashboard.findOneAndUpdate({'source.identifier':req.params.id},{$addToSet:{monitors:req.body.monitor}},function(err,doc){
			if (err) res.status(500).send('There was some problem with the server.');
			User.findOneAndUpdate({_id:req.body.monitor},{$addToSet:{dashboards:{dashboardId:doc._id,admin:false}}},function(err,user){
				if(err) res.status(500).send('There was some problem with the server.');
				else
					res.status(200).json({"_id":user._id,"displayName":user.displayName,"email":user.email});
			});
		});
	}else{
		res.status(500).send('You have requested for something unethical.');
	}
};

exports.delAdmin = function(req, res){
	Dashboard.findOneAndUpdate({'source.identifier':req.params.id},{$pull:{monitors:req.query.monitorId}},function(err,doc){
			if (err) res.status(500).send();
			User.findOneAndUpdate({_id:req.query.monitorId},{$pull:{dashboards:{dashboardId:doc._id}}},function(err,user){
				if(err) res.status(500).send();
				else
					res.status(200).send();
					//res.status(200).json({"displayName":user.displayName,"email":user.email});
			});
	});
};

exports.getChart = function(req, res){
	Chart.findById(req.query.id,function(err,chart){
		if(err) res.status(500).send('There was some problem with the server.');
		else
			res.status(200).json({"response":chart});
	});
};

exports.addChart = function(req, res){
	var chart = new Chart(req.body);
	chart.save(function(err, doc){
		if (err) res.status(500).send('There was some problem with the server.');
		else{
			Dashboard.findOneAndUpdate({'source.identifier':doc.identifier},{$addToSet:{charts:doc._id},updated:Date.now()},function(err,chart){
				if (err) res.status(500).send('There was some problem with the server.');
				else res.status(200).send('This chart is added to your dashboard.');
			});
		}
	});
};

exports.delChart = function(req, res){
	Chart.findByIdAndRemove(req.query.id, function(err,chart){
		if (err) res.status(500).send('There was some problem with the server.');
		else{
			Dashboard.findOneAndUpdate({'source.identifier':chart.identifier},{$pull:{charts:chart._id},updated:Date.now()},function(err,doc){
				if (err) res.status(500).send('There was some problem with the server.');
				else res.status(200).send('Chart deleted.');
			});
		}
	});
};

exports.hasAuthorization = function(req, res, next) {
	if (req.body.userId !== req.user.id) {
		return res.status(403).send({
			message: 'User is not authorized'
		});
	}
	next();
};