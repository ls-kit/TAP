var provider_earning = require('../../app/controllers/provider_earning');
var ProviderDailyEarning = require('mongoose').model('provider_daily_earning');

module.exports = function (app) {

    app.route('/get_provider_daily_earning_detail').post(provider_earning.get_provider_daily_earning_detail);
    app.route('/get_provider_weekly_earning_detail').post(provider_earning.get_provider_weekly_earning_detail);
	app.route('/instant_payout_to_provider').post(provider_earning.instant_payout_to_provider);
	app.route('/get_platform_balance').post(provider_earning.get_platform_balance);
	app.route('/get_total_provider_pending_amount').post(provider_earning.get_total_provider_pending_amount);

};





