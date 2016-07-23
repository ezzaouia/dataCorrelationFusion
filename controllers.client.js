'use strict';

let controllers = angular.module('controllers.client', []);

// controller definition goes here
function MainCtrl($http, $mdToast, $log, $interval) {

    let vm = this;

    this.audioEmotions = null;
    this.videoEmotions = null;
    this.selfReportedEmotions = null;
    this.spSessions = null;
    this.startEndSwitcher = 'START';

    // init function 
    let loadJsonData = function () {
        // progress
        vm.activated = true;
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
            // progress
            vm.activated = false;
        });
    };

    // call init
    loadJsonData();

    // apply filter
    this.applyFilter = function () {
        vm.activated = true;
        // check if a session is selected 
        if (!vm.selectedSpSessions) {
            vm.showSimpleToast('Please select a session!');
            return;
        }

        // get selfReported emotions from loaded data
        getSelfReportedEmotionsBySessionFromJsonData(vm.selfReportedEmotions, vm.selectedSpSessions);
        vm.activated = false;
    };


    function getSelfReportedEmotionsBySessionFromJsonData(jsonData, selectedSpSessions) {

        if (typeof selectedSpSessions === 'string') {
            selectedSpSessions = [selectedSpSessions];
        }

        let groupedEmotions = [];
        _.forEach(selectedSpSessions, function (spSessionId) {
            let filtered = _.where(jsonData, {
                'sp_session': {
                    '$oid': spSessionId
                },
                'check_point': vm.startEndSwitcher
            });
            filtered = _.map(filtered, _.partialRight(_.pick, 'sp_session', 'emotions', 'check_point', 'created'));
            groupedEmotions = groupedEmotions.concat(filtered);
        });

        let filter = _.map(groupedEmotions, _.partialRight(_.pick, 'emotions'));

        let emotions = _.pluck(filter, 'emotions');

        let mood = _.map(emotions, function (emotion) {
            return [emotion.valence_level, emotion.arousal_level];
        });

        let discreteEmotions = _.pluck(emotions, 'discrete_emotions');

        discreteEmotions = _.reduceRight(discreteEmotions, function (flattened, other) {
            return flattened.concat(other);
        }, []);

        discreteEmotions = _.chain(discreteEmotions).groupBy('emotion_name').value();

        discreteEmotions = _.mapValues(discreteEmotions, function (tab) {
            return _.pluck(tab, 'emotion_level');
        });

        _.map(vm.discrete_emotions, function (item) {
            item.emotion_level = [];
            return item;
        });

        _.forEach(discreteEmotions, function (emotionLevelValues, emotionName) {
            let objectToChange = _.find(vm.selfReportedDiscreteEmotions, { emotion_name: emotionName });
            let index = _.indexOf(vm.selfReportedDiscreteEmotions, objectToChange);
            vm.selfReportedDiscreteEmotions.splice(index, 1, {
                emotion_name: emotionName,
                emotion_display_name: objectToChange.emotion_display_name,
                emotion_icon: objectToChange.emotion_icon,
                emotion_level: emotionLevelValues
            });
        });
        vm.selfReportedDiscreteEmotions = _.cloneDeep(vm.selfReportedDiscreteEmotions);
        vm.selfReportedMoodMapEmotions = mood;
        getSelfReportedProjectedDiscreteEmotions();
    }

    this.selfReportedProjectedDiscreteEmotions = [];
    let getSelfReportedProjectedDiscreteEmotions = function () {
        vm.selfReportedProjectedDiscreteEmotions = [];
        let filter = _.filter(vm.selfReportedDiscreteEmotions, function (item) {
            return _.size(item.emotion_level) > 0;
        });
        if (_.size(filter)) {
            _.forEach(filter, function (item) {
                let matchedValenceArousal = _.where(valenceArousalMappingTable, { 'emotion_name': item.emotion_name });
                vm.selfReportedProjectedDiscreteEmotions.push([_.first(_.pluck(matchedValenceArousal, 'valence')) / 100.00, _.first(_.pluck(matchedValenceArousal, 'arousal')) / 100.00, item.emotion_name, item.emotion_level])
            });

            vm.selfReportedProjectedDiscreteEmotions.push(_getWeightedMeanPoint(vm.selfReportedProjectedDiscreteEmotions));
        } else {
            vm.showSimpleToast('Nothing to map!');
        }
    };


    /**
     * Map projected points discrete emotions
     * @param projectedPoints
     * @private
     */
    function _getWeightedMeanPoint(projectedPoints) {
        // get positive points with weights
        let weightsPoisitivesPoints = { points: [], weights: [] };
        _.forEach(projectedPoints, function (item) {
            //if (item[ 0 ] > 0 && item[ 1 ] > 0) {
            weightsPoisitivesPoints['points'].push([item[0], item[1]]);
            weightsPoisitivesPoints['weights'].push(item[3]);
            ///}
        });
        // normalize weights
        let W = _.map(weightsPoisitivesPoints['weights'], function (w) {
            return w / _.sum(weightsPoisitivesPoints['weights']);
        });

        // compute mean weight
        var xMean = 0, yMean = 0;
        weightsPoisitivesPoints['weights'][0] = 100;

        _.forEach(weightsPoisitivesPoints['points'], function (xy, index) {
            xMean += W[index] * xy[0];
            yMean += W[index] * xy[1];
        });

        return [xMean, yMean, 'Weighted Mean'];
    }

    function _propPaisWiseArgmax(object) {
        let vals = _.values(object);
        let keys = _.keys(object);
        let max = _.max(vals);
        return [keys[_.indexOf(vals, max)].toUpperCase(), max];
    }

    // lostr logic
    let last = {
        bottom: false,
        top: true,
        left: false,
        right: true
    };

    this.toastPosition = angular.extend({}, last);

    this.getToastPosition = function () {
        sanitizePosition();
        return Object.keys(vm.toastPosition).filter(function (pos) {
            return vm.toastPosition[pos];
        }).join(' ');
    };

    function sanitizePosition() {
        let current = vm.toastPosition;
        if (current.bottom && last.top) current.top = false;
        if (current.top && last.bottom) current.bottom = false;
        if (current.right && last.left) current.left = false;
        if (current.left && last.right) current.right = false;
        last = angular.extend({}, current);
    }

    this.showSimpleToast = function (message) {
        let pinTo = vm.getToastPosition();
        $mdToast.show(
            $mdToast.simple().textContent(message).position(pinTo).hideDelay(3000)
        );
    };


    this.selfReportedDiscreteEmotions = [{
        emotion_name: 'SURPRISE',
        emotion_display_name: 'surprise',
        emotion_icon: 'sentiment_very_satisfied',
        emotion_level: []
    }, {
            emotion_name: 'HAPPINESS',
            emotion_display_name: 'happiness',
            emotion_icon: 'mood',
            emotion_level: []
        }, {
            emotion_name: 'NEUTRAL',
            emotion_display_name: 'neutral',
            emotion_icon: 'sentiment_neutral',
            emotion_level: []
        }, {
            emotion_name: 'SADNESS',
            emotion_display_name: 'sadness',
            emotion_icon: 'mood_bad',
            emotion_level: []
        }, {
            emotion_name: 'ANGER',
            emotion_display_name: 'anger',
            emotion_icon: 'sentiment_dissatisfied',
            emotion_level: []
        },
        {
            emotion_name: 'FEAR',
            emotion_display_name: 'fear',
            emotion_icon: 'sentiment_very_dissatisfied',
            emotion_level: []
        }];

    // Living Well on the Spectrum: How to Use Your Strengths to Meet the ...
    // Par Valerie L. Gaus, page 91 Joy === Happy
    let valenceArousalMappingTable = [
        { 'emotion_name': 'ANGER', 'valence': -37, 'arousal': 47, dim: 'np' },
        { 'emotion_name': 'FEAR', 'valence': -61, 'arousal': 7, dim: 'np' },
        { 'emotion_name': 'HAPPINESS', 'valence': 68, 'arousal': 7, dim: 'pp' },
        { 'emotion_name': 'SADNESS', 'valence': -68, 'arousal': -35, dim: 'nn' },
        { 'emotion_name': 'NEUTRAL', 'valence': 0, 'arousal': 0, dim: 'pp' },
        { 'emotion_name': 'SURPRISE', 'valence': 30, 'arousal': 8, dim: 'pp' },
        { 'emotion_name': 'CONTEMPT', 'valence': -55, 'arousal': 43, dim: 'np' },
        { 'emotion_name': 'DISGUST', 'valence': -68, 'arousal': 20, dim: 'np' }
    ];

    this.mood = {
        xValue: 0,
        yValue: 0,
        bMoodMapClicked: false
    };
}

controllers.controller('MainCtrl', MainCtrl);