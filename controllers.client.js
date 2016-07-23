'use strict';

let controllers = angular.module('controllers.client', []);

// controller definition goes here
function MainCtrl($http) {

    let vm = this;
    
    this.audioEmotions = null;
    this.videoEmotions = null;
    this.selfReportedEmotions = null;
    this.spSessions = null;

    // init function 
    let loadJsonData = function () {
        // load self reported json data
        async.waterfall([
            function (callback) {
                $http.get('./data/emoselfreporteds.json').then(function (res) {
                    callback(null, res.data.selfReported);
                    vm.selfReportedEmotions = _.sortBy(res.data.selfReported, 'created.$date');
                }, function (error) {
                    callback(error);
                });
            },
            // fill session filter after loading json data
            function (data, callback) {
                let sp_sessions = _.sortBy(data, 'created.$date');
                sp_sessions = _.map(sp_sessions, _.partialRight(_.pick, 'sp_session'));
                sp_sessions = _.uniq(_.pluck(sp_sessions, 'sp_session.$oid'));
                callback(null, data, sp_sessions);
            }
        ], function (err, data, sessions) {
            if (err) {
                console.log(err);
                return;
            }
            // put sp spSessions & selfReportedEmotions in the scope
            vm.spSessions = sessions;
            vm.selfReportedEmotions = _.sortBy(data, 'created.$date');
        });

        // start loading audios json data
        async.waterfall([
            function (callback) {
                $http.get('./data/emoaudios.json').then(function (res) {
                    vm.audioEmotions = res.data;
                    callback(null, vm.audioEmotions);
                }, function (err) {
                    callback(err);
                });
            }
        ], function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            // put audio emotions data in mainCtrl scope
            vm.audioEmotions = data;
        });

        // start loading videos json data
        async.waterfall([
            function (callback) {
                $http.get('./data/emovideos.json').then(function (res) {
                    vm.videoEmotions = res.data;
                    callback(null, vm.videoEmotions);
                }, function (err) {
                    callback(err);
                });
            }
        ], function (err, data) {
            if (err) {
                console.log(err);
                return;
            }
            // put video emotions data in mainCtrl scope
            this.videoEmotions = data;
        });
    };

    // call init
    loadJsonData();


}

controllers.controller('MainCtrl', MainCtrl);