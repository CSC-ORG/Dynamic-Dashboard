'use strict';

/**
 * Module dependencies.
 */
var passport = require('passport');

module.exports = function(app) {
	// User Routes
	var users = require('../../app/controllers/users.server.controller');
	var dashboard = require('../../app/controllers/dashboard.server.controller');
	// Setting up the users profile api
	app.route('/users/dashboards').get(users.getUserDashboards);
	app.route('/users/me').get(users.me);
	app.route('/users').put(users.update);
	app.route('/users/accounts').delete(users.removeOAuthProvider);

	// Setting up the users password api
	app.route('/users/password').post(users.changePassword);
	app.route('/auth/forgot').post(users.forgot);
	app.route('/auth/reset/:token').get(users.validateResetToken);
	app.route('/auth/reset/:token').post(users.reset);

	// Setting up the users authentication api
	app.route('/auth/signup').post(users.signup);
	app.route('/auth/signin').post(users.signin);
	app.route('/auth/signout').get(users.signout);

	// Setting the facebook oauth routes
	app.route('/auth/facebook').get(passport.authenticate('facebook', {
		scope: ['email']
	}));
	app.route('/auth/facebook/callback').get(users.oauthCallback('facebook'));

	// Setting the twitter oauth routes
	app.route('/auth/twitter').get(passport.authenticate('twitter'));
	app.route('/auth/twitter/callback').get(users.oauthCallback('twitter'));

	// Setting the google oauth routes
	app.route('/auth/google').get(passport.authenticate('google', {
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email'
		]
	}));
	app.route('/auth/google/callback').get(users.oauthCallback('google'));

	// Setting the linkedin oauth routes
	app.route('/auth/linkedin').get(passport.authenticate('linkedin'));
	app.route('/auth/linkedin/callback').get(users.oauthCallback('linkedin'));

	// Setting the github oauth routes
	app.route('/auth/github').get(passport.authenticate('github'));
	app.route('/auth/github/callback').get(users.oauthCallback('github'));

	// Finish by binding the user middleware
	app.param('userId', users.userByID);
	/**********************************************************/
	//add Dashboards
	app.route('/dashboard').post(users.requiresLogin, dashboard.hasAuthorization, dashboard.create);
	//get dashboard and update
	app.route('/dashboard/:id')
			.get(users.requiresLogin,dashboard.get)
			.put(users.requiresLogin,dashboard.update);
	//Datasets CRUD		
	app.route('/dashboard/:id/dataset')
			.get(users.requiresLogin,dashboard.getDatasets)
			.post(users.requiresLogin,dashboard.addDataset);
	//Get admins and monitors of dashboard
	app.route('/dashboard/:id/admins')
			.get(users.requiresLogin,dashboard.getAdmins)
			.post(users.requiresLogin,dashboard.addAdmin)
			.delete(users.requiresLogin,dashboard.delAdmin);
	//upload file and send request to engine
	app.post('/sheet', dashboard.getSheetNames);
	app.post('/validate', dashboard.addFile);
	//charts CRUD
	app.route('/chart')
			.get(users.requiresLogin,dashboard.getChart)
			.post(users.requiresLogin,dashboard.addChart)
			.delete(users.requiresLogin,dashboard.delChart);
	//Get suggestions
	app.get('/users/suggestions',users.userSuggestions);
	//Get chart data
	app.post('/chart',dashboard.getDatasetData);
	app.post('/data',dashboard.viewSource);
};