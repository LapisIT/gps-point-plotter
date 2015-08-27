angular.module('myApp.plotter', ['uiGmapgoogle-maps'])

    .config(
    ['uiGmapGoogleMapApiProvider', function(GoogleMapApiProviders) {
        GoogleMapApiProviders.configure({
            v: '3.17',
            libraries: 'weather,geometry,visualization'
        });
    }])

    .controller('PlotterCtrl', function ($scope, $log) {

        $scope.modeIcons = [
            {mode: "Best for Navigation Walk", icon: "images/yellow.png"},
            {mode: "Best for Navigation Boat", icon: "images/blue.png"},
            {mode: "Best for walk - No Nav", icon: "images/darkgreen.png"},
            {mode: "Best for Boat - No Nav", icon: "images/brown.png"},
            {mode: "Nearest 10m for Walk", icon: "images/orange.png"},
            {mode: "Nearest 10m for Boat", icon: "images/pink.png"}
        ];
        $scope.centerIcon="images/red.png";
        $scope.centerMarker = {id: -99, icon: $scope.centerIcon, coord: {}};

        $scope.map = { center: { latitude: -37.8, longitude: 144.9 }, zoom: 12,
            options: {
                scaleControl: true
            }};

        $scope.markers = [];
        $scope.csv = [];
        $scope.csvHeader = [];

        $scope.windowOptions = {
            show: false,
            data: []
        };

        function _createPoint(model) {
            return {
                latitude: model.coord.latitude,
                longitude: model.coord.longitude,
                horizontalAccuracy: model.horizontalAccuracy,
                locationObjectTimestamp: model.locationObjectTimestamp,
                currentDate: model.currentDate,
                timeDifferenceFromModeStart: model.timeDifferenceFromModeStart,
                timeDifferencePrevious:model.timeDifferencePrevious,
                distanceToPrevious:model.distanceToPrevious
            }
        }

        $scope.findIcon = function(mode) {
            var result = "images/purple_MarkerA.png"
            $scope.modeIcons.forEach(function(element, index, array) {
                if (mode == element.mode) {
                    result = element.icon;
                }
            })
            return result;
        }

        $scope.clickMarker = function(data) {
            $scope.windowOptions.show = !$scope.windowOptions.show;
            $scope.windowOptions.coord = data.model.coord;

            $scope.windowParams = {
                data: [{
                    mode: data.model.mode,
                    points: [_createPoint(data.model)]
                }]
            }

        };

        $scope.findIndexInList = function(record, list) {
            var resultIndex = -1;
            list.forEach(function(element, index, array) {
                if (record.mode == array[index].mode) {
                    resultIndex = index;
                }
            });

            return resultIndex;
        }

        $scope.clusterEvents = {
            click: function (cluster, clusterModels) {
                //alert("Cluster Models: clusterModels: " + JSON.stringify(clusterModels));
                var model = clusterModels[0];
                $scope.windowOptions.show = !$scope.windowOptions.show;
                $scope.windowOptions.coord = model.coord;
                $scope.windowParams = {
                    data: []
                }

                angular.forEach(clusterModels, function(model) {
                    var index = $scope.findIndexInList(model, this);
                    if (index<0) {
                        var record = {
                            mode: model.mode,
                            points: []
                        };
                        this.push(record);
                        index=this.length-1;
                    }
                    this[index].points.push(_createPoint(model));

                }, $scope.windowParams.data);

            }

        };

        $scope.closeClick = function() {
            $scope.windowOptions.show = false;
        };

        $scope.loadCenter = function() {
            $scope.map.center.latitude = $scope.centerMarker.coord.latitude;
            $scope.map.center.longitude = $scope.centerMarker.coord.longitude;
            $scope.markers.push($scope.centerMarker);
        }

        $scope.loadCSVData = function ($fileContent) {
            try {
                $scope.csv = d3.csv.parseRows($fileContent);
                $scope.csvHeader = $scope.csv.shift();
                $scope.markers = [];
                var index = 1;
                angular.forEach($scope.csv, function(value) {
                    var marker = {
                        id: index,
                        coord: {latitude: parseFloat(value[5]), longitude: parseFloat(value[6])},
                        icon: $scope.findIcon(value[0]),
                        mode: value[0],
                        horizontalAccuracy: parseFloat(value[8]),
                        currentDate: value[10],
                        locationObjectTimestamp: value[11],
                        timeDifferenceFromModeStart: parseFloat(value[12]),
                        timeDifferencePrevious: parseFloat(value[13]),
                        distanceToPrevious:  parseFloat(value[14])
                    }

                    this.push(marker);
                    index++;
                }, $scope.markers);

            } catch (e) {
                console.error('CSV Plotting tool > load: Your file should be in csv format: ', e);
                $scope.noResult = true;
            }
        }
    })

    .directive('onReadFile', function ($parse, $log) {
        return {
            restrict: 'A',
            scope: false,
            link: function (scope, element, attrs) {
                var fn = $parse(attrs.onReadFile);

                element.on('change', function (onChangeEvent) {
                    var file =  (onChangeEvent.target).files[0]
                    $log.info('onReadFile.onChange... onChangeEvent.srcElement:%s, ' +
                        'onChangeEvent.target:%s, (onChangeEvent.srcElement || onChangeEvent.target).files[0]: %s',
                        onChangeEvent.srcElement, onChangeEvent.target,
                        file)

                    var reader = new FileReader();

                    reader.onload = function (onLoadEvent) {

                        scope.$apply(function () {
                            fn(scope, {$fileContent: onLoadEvent.target.result});
                        });
                    };
                    reader.onerror = function (onLoadEvent) {

                    };

                    reader.readAsText((onChangeEvent.srcElement || onChangeEvent.target).files[0]);

                });
            }
        };
    })