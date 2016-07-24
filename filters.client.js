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
        scale.domain([0, 100]);
        scale.range([-100, 100]);
        return scale(nbr);
    };
});

// first approach for compute valence and arousal from discrete emotions
filters.filter('valenceArousalAsAvgMaxPosMaxNeg', function () {
    return function (imageScores) {
        // group emotion by pos/neg
        let neutral = _.pick(imageScores, ['neutral']);
        let posValence = _.pick(imageScores, ['happiness', 'surprise']);
        let negValence = _.pick(imageScores, ['sadness', 'disgust', 'contempt', 'fear', 'anger']);

        let posArousal = _.pick(imageScores, ['anger', 'fear']);
        let negArousal = _.pick(imageScores, ['sadness', 'disgust']);

        let posVal = _propPaisWiseArgmax(posValence)[1];
        let negVal = _propPaisWiseArgmax(negValence)[1];

        let posArou = _propPaisWiseArgmax(posArousal)[1];
        let negArou = _propPaisWiseArgmax(negArousal)[1];

        let sign = (posVal >= negVal) ? 1 : -1;
        let valence = (posVal + negVal) * 0.5 + sign * 0.5 * (_.max([posVal, negVal]) + sign * _.get(neutral, 'neutral'));
        let arousal = (posArou + negArou) * 0.5;

        return { valence: valence, arousal: arousal };
    };
});

filters.filter('imageScoresWeightedMean', function (valenceArousalMapperFilter) {
    return function (scoresObject) {
        var mean = { valence: 0, arousal: 0 };

        _.forEach(scoresObject, function (val, key) {
            mean['valence'] += Number(val) * _.get(valenceArousalMapperFilter(key), 'valence');
            mean['arousal'] += Number(val) * _.get(valenceArousalMapperFilter(key), 'arousal');
        });
        mean = _.mapValues(mean, function (val) {
            return val / 100;
        });
        return mean;
    };
});

filters.filter('argmaxEmotion', function (propPaisWiseArgmaxFilter, valenceArousalMapperFilter) {
    return function (scoresObject) {
        let valenceArousal = valenceArousalMapperFilter(propPaisWiseArgmaxFilter(scoresObject)[0]);
        valenceArousal = _.pick(valenceArousal, ['valence', 'arousal']);
        valenceArousal = _.mapValues(valenceArousal, function (val) {
            return val / 100;
        });
        return _.extend({}, valenceArousal, { 'weight': propPaisWiseArgmaxFilter(scoresObject)[1] });
    };
});

filters.filter('propPaisWiseArgmax', function () {
    return function (object) {
        let vals = _.values(object);
        let keys = _.keys(object);
        let max = _.max(vals);
        return [keys[_.indexOf(vals, max)].toUpperCase(), max];
    };
});

filters.filter('valenceArousalMapper', function () {
    return function (emotionKey) {
        return _.first(_.where(valenceArousalMappingTable, { 'emotion_name': emotionKey.toUpperCase() }));
    };
});

filters.filter('valenceArousalSegmentMean', function () {
    return function (arrayObject) {
        let mean = { valence: 0, arousal: 0 };
        _.forEach(arrayObject, function (object) {
            mean['valence'] += _.get(object, 'valence');
            mean['arousal'] += _.get(object, 'arousal');
        });

        mean['valence'] /= _.size(arrayObject);
        mean['arousal'] /= _.size(arrayObject);

        return mean;
    };
});

filters.filter('valenceArousalSegmentDomEmotionWeightedMean', function (normalizeVectorFilter) {
    return function (bagValenceArousalWeight) {
        let normalWeights = normalizeVectorFilter(_.pluck(bagValenceArousalWeight, 'weight'));
        let mean = { valence: 0, arousal: 0 };
        _.forEach(bagValenceArousalWeight, function (object, index) {
            mean['valence'] += _.get(object, 'valence') * normalWeights[index];
            mean['arousal'] += _.get(object, 'arousal') * normalWeights[index];
        });

        return mean;
    };
});

filters.filter('normalizeVector', function () {
    return function (vector) {
        return _.map(vector, function (nbr) {
            return nbr / _.sum(vector);
        });
    };
});


// helpers methods
// ---------------
function _propPaisWiseArgmax(object) {
    let vals = _.values(object);
    let keys = _.keys(object);
    let max = _.max(vals);
    return [keys[_.indexOf(vals, max)].toUpperCase(), max];
}

let valenceArousalMappingTable = [
    { 'emotion_name': 'ANGER', 'valence': -37, 'arousal': 47, 'dim': 'np', 'dim2': 'neg' },
    { 'emotion_name': 'FEAR', 'valence': -61, 'arousal': 7, 'dim': 'np', 'dim2': 'neg' },
    { 'emotion_name': 'HAPPINESS', 'valence': 68, 'arousal': 7, 'dim': 'pp', 'dim2': 'pos' },
    { 'emotion_name': 'SADNESS', 'valence': -68, 'arousal': -35, 'dim': 'nn', 'dim2': 'neg' },
    { 'emotion_name': 'NEUTRAL', 'valence': 0, 'arousal': 0, 'dim': 'pp', 'dim2': 'pos' },
    { 'emotion_name': 'SURPRISE', 'valence': 30, 'arousal': 8, 'dim': 'pp', 'dim2': 'pos' },
    { 'emotion_name': 'CONTEMPT', 'valence': -55, 'arousal': 43, 'dim': 'np', 'dim2': 'neg' },
    { 'emotion_name': 'DISGUST', 'valence': -68, 'arousal': 20, 'dim': 'np', 'dim2': 'neg' }
];