'use strict';

// Users service used for communicating with the users REST endpoint
angular.module('users').factory('Users', ['$resource',
	function($resource) {
		return $resource('users', {}, {
			update: {
				method: 'PUT'
			}
		});
	}
]).factory('Dashboard', ['$http',
	function($http){
		
		var factory = {};
		
		factory.identifier = null;

		factory.getUserDashboard = function(){
			return $http.get('/users/dashboards');
		};
		
		factory.create = function(obj){
			return $http.post('/dashboard',obj);
		};

		factory.get = function(id){
			return $http.get('/dashboard/'+id);
		};

		factory.update = function(id,obj){
			return $http.put('/dashboard/'+id,obj);
		};

		factory.getSheetNames = function(payload){
			return $http.post('/sheet',payload,{
                        transformRequest: angular.identity,
                        headers: {'Content-Type': undefined}
                	});
		};

		factory.addFile = function(payload){
			return $http.post('/validate',payload,{
                        transformRequest: angular.identity,
                        headers: {'Content-Type': undefined}
                	});
		};

		factory.viewSource = function(obj){
			return $http.post('http://127.0.0.1:8000/data/',obj);
		};

		factory.addLink = function(source){
			return $http.post('/validate', source);
		};

		factory.addDataset = function(dataset,identifier){
			return $http.post('/dashboard/'+identifier+'/dataset',dataset);
		};

		factory.getDatasets = function(identifier){
			return $http.get('/dashboard/'+identifier+'/dataset');
		};

		factory.getDatasetData = function(obj){
			return $http.post('http://127.0.0.1:8000/chart/',obj);
		}

		factory.getAdmins = function(identifier){
			return $http.get('/dashboard/'+identifier+'/admins');
		};

		factory.delAdmin = function(identifier,monitorId){
			return $http.delete('/dashboard/'+identifier+'/admins?monitorId='+monitorId);
		};

		factory.addChart = function(chart){
			return $http.post('/chart',chart);
		};

		factory.getCharts = function(id){
			return $http.get('/chart?id='+id);
		};

		factory.delChart = function(id){
			return $http.delete('/chart?id='+id);
		};

		return factory;
	}
]).factory('Chart', ['$http', 
	function($http){
		var factory = {};

		return factory;
	}
]);