(function() {

    angular
        .module('suseData.crowbar')
        .factory('upgradeStatusFactory', upgradeStatusFactory);

    upgradeStatusFactory.$inject = ['$http', '$timeout', 'upgradeFactory', 'UPGRADE_STEP_STATES'];
    /* @ngInject */
    function upgradeStatusFactory($http, $timeout, upgradeFactory, UPGRADE_STEP_STATES) {
        var factory = {
            waitForStepToEnd: waitForStepToEnd,
        };

        return factory;

        /**
         * Polls for upgrade status until step `step` is `passed`.
         *
         * @param {string} step - Step name as defined in status API response
         * @param {function} onSuccess - Callback to be executed with last response from status API
         *     when waiting time finishes successfully
         * @param {function} onError - Callback to be executed if status API returns error
         * @param {int} pollingInterval - Interval used to poll the upgrade status
         * @param {int} [allowedDowntimeLeft=0] - If specified, temporary unavailability of status
         *     API will not trigger `onError` handler and will not stop polling. The downtime
         *     allowance is common for whole call so if there are multiple short unavailability
         *     periods, the total time (sum) is checked.
         */
        function waitForStepToEnd(step, onSuccess, onError, pollingInterval, allowedDowntimeLeft) {
            allowedDowntimeLeft = angular.isDefined(allowedDowntimeLeft) ? allowedDowntimeLeft : 0;
            upgradeFactory.getStatus()
                .then(
                    function (response) {
                        if (response.data.steps[step].status == UPGRADE_STEP_STATES.passed) {
                            onSuccess(response);
                        } else {
                            // schedule another check
                            $timeout(function () {
                                factory.waitForStepToEnd(
                                    step, onSuccess, onError,
                                    pollingInterval, allowedDowntimeLeft
                                );
                            }, pollingInterval);
                        }
                    },
                    function (errorResponse) {
                        // stop polling and run error callback if we ran out of allowed downtime
                        if (allowedDowntimeLeft <= 0) {
                            onError(errorResponse);
                        } else {
                            // schedule another check but with less downtime allowance
                            $timeout(function () {
                                factory.waitForStepToEnd(
                                    step, onSuccess, onError,
                                    pollingInterval, allowedDowntimeLeft - pollingInterval
                                );
                            }, pollingInterval);
                        }
                    }
                );
        }
    }
})();
