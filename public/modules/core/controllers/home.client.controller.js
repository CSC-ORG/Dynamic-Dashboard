'use strict';

angular.module('core').controller('HomeController', ['$scope', '$http', '$interval', 'Authentication','Dashboard',
	function($scope, $http, $interval, Authentication, Dashboard) {
		// This provides Authentication context.
		var colors = [
			'#D24D57','#EF4836','#E74C3C','#67809F','#4ECDC4','#87D37C','#26A65B','#F1A9A0','#F62459','#D2527F','#AEA8D3','#C5EFF7',
			'#336E7B','#1BBC9B','#2ECC71','#019875','#1E824C','#F5D76E','#F7CA18','#F89406','#BF55EC','#BE90D4','#59ABE3','#81CFE0',
			'#F4B350','#F27935','#F4D03F','#F9690E'
		];		
		$scope.authentication = Authentication;
		$scope.colors = [];
		
		if($scope.authentication.user){
			Dashboard.getUserDashboard().success(function(data){
				$scope.authentication.user.dashboards = [];
				$scope.authentication.user.dashboards = data.dashboards;
				$scope.dummyArrayForRows = [];
				for(var i=0;i<data.dashboards.length;i++){
					if(i%3==0) $scope.dummyArrayForRows.push(i);
					$scope.colors.push(shuffle(colors)[colors.length/2]);
				};
			}).error(function(err){
				console.log(err);
			});
		}
		else{
			var i = 0;
			var captions = ['Create Datasets','Make Visualisations', 'Share Dashboards'];
			$scope.caption = captions[i];
			$interval(function(){
				$scope.caption = captions[++i];
				if(i==2)
					i=-1;
			}, 3000);
		}
		
		function shuffle(array) {
  			var currentIndex = array.length, temporaryValue, randomIndex;

  			// While there remain elements to shuffle...
  			while (0 !== currentIndex) {

    		// Pick a remaining element...
    		randomIndex = Math.floor(Math.random() * currentIndex);
   			currentIndex -= 1;

    		// And swap it with the current element.
    		temporaryValue = array[currentIndex];
    		array[currentIndex] = array[randomIndex];
    		array[randomIndex] = temporaryValue;
  			}

  			return array;
		};

	}
]).controller('DashboardController', ['$scope', 'Authentication','Dashboard', '$stateParams', '$state', '$http',
	function($scope, Authentication, Dashboard, $stateParams, $state, $http){
		$scope.authentication = Authentication;
		if (Object.keys($scope.authentication.user).length==0) $location.path('/');
		$scope.dashboard = {};
		//console.log($scope.authentication);
		if(!$stateParams.id){
			$scope.dashboard = {};
			$scope.dashboard.source = '';
			$scope.dashboard.title = 'Give your dashboard a name by clicking here!';
			$scope.dashboard.description = 'Write a brief description of your dashboard here!';
			$scope.upload=true;
			$scope.edit = true;
			$scope.create_btn = false;
			$scope.dashboard.charts = [];
		}else{
			var dashes = $scope.authentication.user.dashboards;
			//find role of landed user and load dashboard properties
			for(var i=0;i<dashes.length;i++){
				if(dashes[i].dashboardId._id===$stateParams.id){
					$scope.admin = dashes[i].admin;
					Dashboard.get($stateParams.id).success(function(data){
						$scope.dashboard = data.response;
						Dashboard.identifier = $scope.dashboard.source.identifier;
					}).error(function(err){
						console.log(err);
						$scope.error = err;
					});
					break;
				}
			};
			//privileges to admin role
			if($scope.admin){
				$scope.edit = false;
				$scope.menu = true;
				$scope.loader = false;
				$scope.edit_btn = 'Edit Dashboard';
			}else{
				$scope.edit = false;
				$scope.menu = false;
			}
		}

		$scope.toggleEdit = function(){
			if($scope.edit_btn==='Save Dashboard'){
				Dashboard.update($stateParams.id,{title:$scope.dashboard.title,description:$scope.dashboard.description})
				.success(function(data){
					$scope.dashboard.title = data.title;
					$scope.dashboard.description = data.description;
					$scope.dashboard.updated = data.updated;	
				})
				.error(function(err){
					$scope.error = err;
				});
			}
			$scope.edit = !$scope.edit;
			$scope.edit_btn = ($scope.edit==true)?'Save Dashboard':'Edit Dashboard';
		};
		
		$scope.checkXLS = function(){
			$scope.isXLS = (/\.xls/.test(document.getElementById('filename').value))?true:false;
		};

		function SendFile(payload){
			Dashboard.addFile(payload).success(function(data){
				if(data.status===200){
					$scope.create_btn = true;
					$scope.dashboard.source = {type:'file',identifier:data.identifier};
				}
				else
					$scope.error = data.error_message;
				$scope.loader = false;
			}).error(function(err){
				$scope.error = 'There was some problem with the server.';
				$scope.loader = false;
			});
		}

		$scope.addFile = function(){
			$scope.create_btn = false;
			$scope.loader = true;
			$scope.error = false;
			document.getElementById('link').value = '';//reset other fields
			var filename = document.getElementById('filename').value;
			var filetype = filename.slice(filename.lastIndexOf('.')+1);
			
			if(filename==''){
				$scope.error = 'Choose an excel or csv file.';
				$scope.loader = false;
			}
			else if(!/(xls|csv)/.test(filetype)){
				$scope.error = 'Invalid file type.';
				$scope.loader = false;
			}
			else{
				switch(filetype){
					case 'xls':
						var sheetno = document.getElementById('sheetno').value;
						if(isNaN(sheetno)||sheetno==""){
							$scope.isXLS = true;
							$scope.error = 'Specify the sheet no.';
							$scope.loader = false;
							return;
						}else{
							var payload = new FormData();
							payload.append('file', document.getElementById('filename').files[0]);
							payload.append('sheetno', sheetno-1);
							payload.append('type', 'file');
							SendFile(payload);
						}
						break;
					case 'csv':
						var payload = new FormData();
						payload.append('file', document.getElementById('filename').files[0]);
						payload.append('type', 'file');
						SendFile(payload);
						break;
					}
			}
		};

		$scope.addLink = function(){
			$scope.create_btn = false;
			$scope.loader = true;
			$scope.error = false;
			document.getElementById('filename').value = null;
			var key = [];
			var link = document.getElementById('link').value || '';
			var key = link.match(/https:\/\/docs.google.com\/spreadsheets\/d\/(.*?)\//);
			if(key!=null){
				$scope.dashboard.source = {type:'link',identifier:key[1]};
				Dashboard.addLink($scope.dashboard.source).success(function(data){
					if(data.status===200){
						$scope.create_btn = true;
						$scope.dashboard.source = {type:'link',identifier:data.identifier};
					}
					else
						$scope.error = data.error_message;
					$scope.loader = false;
				}).error(function(err){
					$scope.error = err;
					$scope.loader = false;
				});
			}
			else{
				$scope.error = 'Invalid spreadsheet link.';	
				$scope.loader = false;
			}	
		};

		$scope.create = function(){
			Dashboard.create({userId:$scope.authentication.user._id,dashboard:$scope.dashboard}).success(function(res){
				$state.go('home',{},{reload:true});
			}).error(function(err){
				console.log(err);
			});
		};

		$scope.removeChart = function(id,index){
			Dashboard.delChart(id).success(function(data){
				$scope.dashboard.charts.splice(index,1);
			}).error(function(err){
				$scope.error = err;
			});
		};
	}
]).controller('ChartController',['$scope', 'Authentication', 'Dashboard', 
	function($scope, Authentication, Dashboard){
		
		Dashboard.getDatasets(Dashboard.identifier).success(function(data){
			$scope.datasets = data.response.datasets;
			$scope.datasets.push({"_id":"", "name": "Select a dataset"});
			$scope.columns = data.response.columns;
		}).error(function(err){
			console.log(err);
		});
		$scope.datasetid = '';
		$scope.xAxis = '';
		$scope.yAxes = [];
		var DatasetData = {};

		$scope.chartTypes = [
		    {"id": "line", "title": "Line"},
		    {"id": "spline", "title": "Smooth line"},
		    {"id": "area", "title": "Area"},
		    {"id": "areaspline", "title": "Smooth area"},
		    {"id": "column", "title": "Column"},
		    {"id": "bar", "title": "Bar"},
		    {"id": "pie", "title": "Pie"},
		    {"id": "scatter", "title": "Scatter"}
  		];

		$scope.dashStyles = [
		    {"id": "Solid", "title": "Solid"},
		    {"id": "ShortDash", "title": "ShortDash"},
		    {"id": "ShortDot", "title": "ShortDot"},
		    {"id": "ShortDashDot", "title": "ShortDashDot"},
		    {"id": "ShortDashDotDot", "title": "ShortDashDotDot"},
		    {"id": "Dot", "title": "Dot"},
		    {"id": "Dash", "title": "Dash"},
		    {"id": "LongDash", "title": "LongDash"},
		    {"id": "DashDot", "title": "DashDot"},
		    {"id": "LongDashDot", "title": "LongDashDot"},
		    {"id": "LongDashDotDot", "title": "LongDashDotDot"}
		];

		$scope.chartStack = [
		    {"id": '', "title": "No"},
		    {"id": "normal", "title": "Normal"},
		    {"id": "percent", "title": "Percent"}
  		];

		$scope.chartSeries = [
		    /*{"name": "Some data", "data": [1, 2, 4, 7, 3]},
		    {"name": "Some data 3", "data": [3, 1, null, 5, 2], connectNulls: true},
		    {"name": "Some data 2", "data": [5, 2, 2, 3, 5], type: "column"},
		    {"name": "My Super Column", "data": [1, 1, 2, 3, 2], type: "column"}*/
		];

		$scope.chartConfig = {
		    options: {
		      chart: {
		        type: 'areaspline',
		        zoomType: 'xy'
		      },
		      plotOptions: {
		        series: {
		          stacking: ''
		        }
		      }
		    },
		    series: $scope.chartSeries,
		    title: {
		      text: 'Type chart title'
		    },
		    subtitle:{
		      text: ''		
		    },
		    credits: {
		      enabled: true,
		      text: 'CSC Dashboards',
		      href: '/'
		    },
		    loading: false,
		    xAxis: {
            	categories: [],
            	title:{
            		text: ''
            	}
        	},
        	yAxis: {
            	title: {
                	text: ''
            	}
        	}
  		};

  		$scope.getDatasetData = function(){
  			Dashboard.getDatasetData({identifier:Dashboard.identifier,datasetid:$scope.datasetid}).success(function(response){
  				DatasetData = response.data;
  			}).error(function(err){
  				console.log(err);
  			});
  		};

  		$scope.getXdata = function(){
  			$scope.chartConfig.xAxis.categories = DatasetData[$scope.xAxis];
  		};

  		$scope.getYdata = function(index){
  			$scope.chartSeries[index].data = DatasetData[$scope.yAxes[index]];
  		};

    	$scope.reflow = function () {
    		$scope.$broadcast('highchartsng.reflow');
  		};

  		$scope.removeSeries = function(index){
  			$scope.chartSeries.splice(index,1);
  		};

  		$scope.addSeries = function(){
  			$scope.chartSeries.push({"name":"Some Data", "data":[], "type": "column"});
  			var i = $scope.chartSeries.length-1;
  			$scope.$watch('chartSeries['+i+'].type',function(newVal){
  				if(newVal==='pie'){
  					var pieData = [];
  					for(var j=0;j<$scope.chartConfig.xAxis.categories.length;j++){
  						pieData.push({name:$scope.chartConfig.xAxis.categories[j],y:$scope.chartSeries[i].data[j]});
  					};
  					$scope.chartSeries[i].data = angular.copy(pieData);
  				}
  			},true);
  		};

  		$scope.addChart = function(){
  			if($scope.chartSeries.length==0||$scope.dataset==''||$scope.xAxis==''||$scope.yAxes.length==0)
  				$scope.error = "You've missed required configuration of the chart.";
  			else{
	  			var chart = {
	  				xAxis:$scope.xAxis,
	  				datasetid:$scope.dataset,
	  				identifier:Dashboard.identifier,
	  				yAxes:$scope.yAxes,
	  				config: $scope.chartConfig
	  			};
	  			
	  			Dashboard.addChart(chart).success(function(response){
	  				$scope.result = response;
	  			}).error(function(err){
	  				$scope.error = err;
	  			});
	  		}
  		};
	}
]).controller('SourceController',['$scope', 'Authentication', 'Dashboard',
	function($scope, Authentication, Dashboard){
		var priority = 0;
		$scope.resultsPerPage = 10; 
		var old_filters = [];
		$scope.filters = [];
		$scope.next = 0;

		$scope.$watch('resultsPerPage',function(newVal,oldVal){
			if(newVal!=oldVal){
				$scope.next = 0;
				$scope.resultsPerPage = Number(newVal); //convert string value from select to number for arithemetic.
				$scope.init();
			}
		});
		
		$scope.init = function(){
			$scope.loader = true;
			Dashboard.viewSource({identifier:Dashboard.identifier,limit:$scope.resultsPerPage,skip:$scope.next,filters:old_filters})
			.success(function(obj){
				$scope.uniqueValues = angular.copy(obj.unique);
				$scope.tableCol = obj.columns;
				$scope.tableData = obj.data;
				$scope.rows = [];
				$scope.numrows = obj.numrows;
				var rows = obj.data[obj.columns[0]].length;
				for(var i=0;i<rows;i++)
					$scope.rows.push(i);
				$scope.loader = false;
			}).error(function(err){
				console.log(err);
			});
		};
		$scope.init();
		 // All filters for a dataset
		$scope.addFilter = function(){
			$scope.filters.unshift({"priority":++priority,"column":"Select Column","select":[],"sort":"0","limit":"10"});
		};

		$scope.removeFilter = function(index){
			$scope.filters.splice(index,1);
		};
		
		$scope.selectColumn = function(index){
			$scope.filters[index].select = angular.copy($scope.uniqueValues[$scope.filters[index].column]);
		};
	
		$scope.filterSelect = function(value,filterIndex){
			var key=$scope.filters[filterIndex].select.indexOf(value);
			if(key>-1)				//If you find a value in selection then remove it
				$scope.filters[filterIndex].select.splice(key,1);
			else
				$scope.filters[filterIndex].select.push(value);
		};

		$scope.applyFilter = function(){
			$scope.loader = true;
			Dashboard.viewSource({identifier:Dashboard.identifier,limit:$scope.resultsPerPage,skip:$scope.next,filters:$scope.filters})
			.success(function(obj){
				old_filters = angular.copy($scope.filters);
				$scope.uniqueValues = angular.copy(obj.unique);
				$scope.tableCol = obj.columns;
				$scope.tableData = obj.data;
				$scope.rows = [];
				$scope.numrows = obj.numrows;
				var rows = obj.data[obj.columns[0]].length;
				for(var i=0;i<rows;i++)
					$scope.rows.push(i);
				$scope.loader = false;
				$scope.next = 0;
			}).error(function(err){
				console.log(err);
			});
		};

		$scope.saveFilter = function(){
			if($scope.fillname == true){
				Dashboard.addDataset({name:$scope.filterName,filters:$scope.filters},Dashboard.identifier)
				.success(function(data){
					$scope.filterName = '';
					$scope.filters = [];  
				}).error(function(err){
					console.log(err);
				});
			}else{
				$scope.fillname = false;	
			}
		};

	}
]).controller('ShareController',['$scope', 'Authentication', 'Dashboard',
	function($scope, Authentication, Dashboard){
		Dashboard.getAdmins(Dashboard.identifier).success(function(data){
			$scope.dashid = Dashboard.identifier;
			$scope.admins = data.admins;
			$scope.monitors = data.monitors;
		}).error(function(err){
			$scope.error = "There was some problem with that request.";
		});

		$scope.delAdmin = function(monitorId){
			Dashboard.delAdmin(Dashboard.identifier,monitorId).success(function(data){
				$scope.monitors.splice($scope.monitors.indexOf(data),1);
			}).error(function(err){
				$scope.error = "There was some problem with that request."
			});
		};
	}
]).directive('userSuggestions',function($http,$compile){
    return {
        restrict: 'E',
        transclude: true,
        scope: { dashboardid: '=dashboardId' },
        template:'<span id="prefetch" class="col-md-9"><input class="typeahead search" type="text" placeholder="Type a name..."></span><span ng-click="addCollab()" class="col-md-3 add-btn bg-red"><span class="glyphicon glyphicon-plus"></span> Add</span>',
        link: function (scope, element) {
        	var selectedUser={};
            scope.addCollab = function(){
            	if(scope.$parent.showAdmins==true&&selectedUser.id!=null){
                	$http.post('/dashboard/'+scope.dashboardid+'/admins',{admin:selectedUser.id}).success(function(data){
		                scope.$parent.admins.push(data);
                	}).error(function(err){
                		scope.$parent.error = err;
                	});
                }else if(scope.$parent.showMonitors==true&&selectedUser.id!=null){
                	$http.post('/dashboard/'+scope.dashboardid+'/admins',{monitor:selectedUser.id}).success(function(data){
		                scope.$parent.monitors.push(data);
                	}).error(function(err){
                		scope.$parent.error = err;
                	});
                }else
                	scope.$parent.error = 'You can select a user from suggestions only.';
            };
            var countries = new Bloodhound({
	            datumTokenizer: Bloodhound.tokenizers.obj.whitespace('email'),
	            queryTokenizer: Bloodhound.tokenizers.whitespace,
	            limit: 10,
	            prefetch: {
	                url: 'users/suggestions',
	                filter: function(list) {
	                    return $.map(list.response, function(item) { return { name: item.displayName,email:item.email,id:item._id}; });
	                }
	            }
        	});

	        countries.initialize();

	        $('#prefetch .typeahead').typeahead(null, {
	            name: 'collaborator',
	            displayKey: 'email',
	            source: countries.ttAdapter(),
	            templates:{
	                suggestion: function(data){return '<p><strong>'+data.name+'</strong> – '+data.email+'</p>'}
	            }
	        }).on('typeahead:selected', function (obj, datum) {
	    		selectedUser = datum;
			});
        }
    };
});
