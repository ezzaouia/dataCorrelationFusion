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