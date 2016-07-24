'use strict';

var filters = angular.module('filters.client', []);

filters.filter('capitalize', function () {
    return function (string) {
        return (!!string) ? string.charAt(0).toUpperCase() + string.substr(1).toLowerCase() : '';
    };
});

filters.filter('abs', function () {
    return function (number) {
        return Math.abs(number);
    };
});

filters.filter('round', function () {
    return function (nbr) {
        return Math.round(nbr);
    };
});

filters.filter('timeToStr', function () {
    return function (date) {
        let sec = date.getSeconds();
        if (sec.toString().length == 1)
            sec = '0' + sec.toString();
        return date.getMinutes().toString() + ':' + sec;
    };
});

filters.filter('timeToDate', function () {
    return function (offset) {
        return new Date(offset);
    };
});

filters.filter('strToNumber', function () {
    return function (str) {
        return Number(str);
    };
});


filters.filter('scale', function (d3) {
    return function (nbr) {
        let scale = d3.scale.linear();
        scale.domain([ 0, 100 ]);
        scale.range([ -100, 100 ]);
        return scale(nbr);
    };
});

// first approach for compute valence and arousal from discrete emotions
filters.filter('valenceArousalAsAvgMaxPosMaxNeg', function () {
    return function (imageScores) {
        // group emotion by pos/neg
        let neutral = _.pick(imageScores, [ 'neutral' ]);
        let posValence = _.pick(imageScores, [ 'happiness', 'surprise' ]);
        let negValence = _.pick(imageScores, [ 'sadness', 'disgust', 'contempt', 'fear', 'anger' ]);

        let posArousal = _.pick(imageScores, [ 'anger', 'fear' ]);
        let negArousal = _.pick(imageScores, [ 'sadness', 'disgust']);

        let posVal = _propPaisWiseArgmax(posValence)[ 1 ];
        let negVal = _propPaisWiseArgmax(negValence)[ 1 ];

        let posArou = _propPaisWiseArgmax(posArousal)[ 1 ];
        let negArou = _propPaisWiseArgmax(negArousal)[ 1 ];

        let sign = (posVal >= negVal) ? 1 : -1;
        let valence = (posVal + negVal) * 0.5 + sign * 0.5 * (_.max([ posVal, negVal ]) + sign * _.get(neutral, 'neutral'));
        let arousal = (posArou + negArou) * 0.5;

        return {valence: valence, arousal: arousal};
    };
});


// helpers methods
// ---------------
function _propPaisWiseArgmax (object) {
    var vals = _.values(object);
    var keys = _.keys(object);
    var max = _.max(vals);
    return [ keys[ _.indexOf(vals, max) ].toUpperCase(), max ];
}