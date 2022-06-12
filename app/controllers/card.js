var Trip_history = require('mongoose').model('Trip_history');
var utils = require('./utils');
var Card = require('mongoose').model('Card');
var User = require('mongoose').model('User');
var Trip = require('mongoose').model('Trip');
var Country = require('mongoose').model('Country');
var Provider = require('mongoose').model('Provider');
var Corporate = require('mongoose').model('Corporate');
var Partner = require('mongoose').model('Partner');
var Settings = require('mongoose').model('Settings');
var utils = require('./utils');
var myTrips = require('./trip');
//// ADD CARD USING POST SERVICE ///// 

exports.get_stripe_add_card_intent = async function (req, res) {

    var stripe = require("stripe")(setting_detail.stripe_secret_key);
    stripe.setupIntents.create({
        usage: 'on_session'
    }, function(error, paymentIntent){
        res.json({success: true, client_secret: paymentIntent.client_secret})
    });
}

exports.get_stripe_payment_intent = async function (req, res) {

    var amount = Number(req.body.amount);
    var user_id = req.body.user_id;
    var trip_detail = await Trip.findOne({_id: req.body.trip_id})
    var trip_history_detail = await Trip_history.findOne({_id: req.body.trip_id});
    if(!trip_detail){
        trip_detail = trip_history_detail;
    }
    if(trip_detail){
        if(!req.body.is_payment_for_tip){
            amount = trip_detail.remaining_payment;
        }
        user_id = trip_detail.user_id;
    }
    var type = Number(req.body.type);
    Table = User;
    switch (type) {
        case Number(constant_json.USER_UNIQUE_NUMBER):
        type = Number(constant_json.USER_UNIQUE_NUMBER);
        Table = User;
        break;
        case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
        type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
        Table = Provider;
        break;
        case Number(constant_json.CORPORATE_UNIQUE_NUMBER):
        type = Number(constant_json.CORPORATE_UNIQUE_NUMBER);
        Table = Corporate;
        break;
        case Number(constant_json.PARTNER_UNIQUE_NUMBER):
        type = Number(constant_json.PARTNER_UNIQUE_NUMBER);
        Table = Partner;
        break;
        default:
        type = Number(constant_json.USER_UNIQUE_NUMBER);
        Table = User;
        break;
    }
    Table.findOne({_id: user_id}).then((detail) => { 
        (async () => {
            var stripe = require("stripe")(setting_detail.stripe_secret_key);
            try {
                if(!req.body.payment_method){
                    var card_detail = await Card.findOne({user_id: detail._id, is_default: true});
                    if(card_detail){
                        console.log(detail.wallet_currency_code)
                        stripe.paymentIntents.create({
                            amount: Math.round((amount * 100)),
                            currency: trip_detail.currencycode, // detail.wallet_currency_code,
                            customer: detail.customer_id,
                            payment_method: card_detail.payment_method
                        }, function(error, paymentIntent){
                            if(paymentIntent){
                                if(trip_detail){
                                    // trip_detail.payment_status = PAYMENT_STATUS.WAITING;
                                    if(!req.body.is_payment_for_tip){
                                        trip_detail.payment_intent_id = paymentIntent.id;
                                    } else {
                                        trip_detail.tip_payment_intent_id = paymentIntent.id;
                                    }
                                    trip_detail.save();
                                }
                                res.json({ success: true, payment_method: card_detail.payment_method, client_secret: paymentIntent.client_secret });
                            } else {
                                if(error.statusCode == 400){
                                    console.log(error.raw.message)
                                }
                                res.json({ success: false, error: error.raw.message});
                            }
                        });
                    } else {
                        res.json({ success: false, error_code: error_message.ERROR_CODE_ADD_CREDIT_CARD_FIRST });
                    }
                } else {
                    stripe.customers.create({
                        payment_method: req.body.payment_method,
                        email: detail.email,
                        name: detail.name,
                        phone: detail.phone
                    }, function (err, customer) {
                        stripe.paymentIntents.create({
                            amount: Math.round((amount * 100)),
                            currency: detail.wallet_currency_code,
                            customer: customer.id,
                            payment_method: req.body.payment_method
                        }, function(error, paymentIntent){
                            if(paymentIntent){
                                if(trip_detail){
                                    // trip_detail.payment_status = PAYMENT_STATUS.WAITING;
                                    if(!req.body.is_payment_for_tip){
                                        trip_detail.payment_intent_id = paymentIntent.id;
                                    } else {
                                        trip_detail.tip_payment_intent_id = paymentIntent.id;
                                    }
                                    trip_detail.save();
                                }
                                res.json({ success: true, payment_method: req.body.payment_method, client_secret: paymentIntent.client_secret });
                            } else {
                                res.json({ success: false, error: error.raw.message});
                            }
                        });
                    });
                }
            } catch (error) {
                if(error.raw){
                    res.json({ success: false, message: error.raw.message });
                } else {
                    res.json({ success: false, message: error.message });
                }
            }
        })();
    });
}

exports.add_card = function (req, res) {

    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'},{name: 'payment_method', type: 'string'},
        {name: 'token', type: 'string'}], function (response) {
        if (response.success) {
            var type = Number(req.body.type);
            switch (type) {
                case Number(constant_json.USER_UNIQUE_NUMBER):
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
                case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                Table = Provider;
                break;
                default:
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
            }

            Table.findOne({_id: req.body.user_id}).then((detail) => { 

                var stripe_secret_key = setting_detail.stripe_secret_key;
                var stripe = require("stripe")(stripe_secret_key);
                if(!detail.customer_id){
                    stripe.customers.create({
                        payment_method: req.body.payment_method,
                        email: detail.email,
                        name: detail.name,
                        phone: detail.phone
                    }, function (err, customer) {
                        detail.customer_id = customer.id;
                        detail.save();
                    });
                } else {
                    stripe.paymentMethods.attach(req.body.payment_method,
                        {
                            customer: detail.customer_id,
                        }, function (err, customer) {
                        
                    });
                }

                stripe.paymentMethods.retrieve(
                    req.body.payment_method,
                (err, paymentMethod)=> {
                    console.log(paymentMethod)
                    Card.find({user_id: req.body.user_id, $or :  [{type: type}, { type: {$exists: false} }]}).then((card_data) => { 

                        var card = new Card({
                            payment_id: req.body.payment_id,
                            user_id: req.body.user_id,
                            token: req.body.token,
                            last_four: paymentMethod.card.last4,
                            payment_method: req.body.payment_method,
                            card_type: paymentMethod.card.brand,
                            type: type,
                            is_default: constant_json.YES
                        });
                        if (card_data.length > 0) {
                            Card.findOneAndUpdate({user_id: req.body.user_id, $or :  [{type: type}, { type: {$exists: false} }], is_default: constant_json.YES}, {is_default: constant_json.NO}).then((card_data) => { 

                            });
                        }
                        card.save().then(() => { 
                            res.json({
                                success: true,
                                message: success_messages.MESSAGE_CODE_YOUR_CARD_ADDED_SUCCESSFULLY,
                                _id: card._id,
                                payment_method: card.payment_method,
                                user_id: card.user_id,
                                last_four: card.last_four,
                                card_type: card.card_type,
                                is_default: card.is_default,
                                payment_id: card.payment_id,
                                type: card.type

                            });
                        }, (err) => {
                            console.log(err)
                            res.json({
                                success: false,
                                error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                            });
                        });

                    });
                });
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};
//// LIST OF INDIVIDUAL USER  CARD SERVICE ////
exports.card_list = function (req, res) {
    
    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'}], function (response) {
        if (response.success) {
            var type = Number(req.body.type);
            switch (type) {
                case Number(constant_json.USER_UNIQUE_NUMBER):
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
                case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                Table = Provider;
                break;
                default:
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
            }

            Table.findOne({_id: req.body.user_id}).then((detail) => { 
                if (!detail) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_FOR_PORBLEM_IN_FETCHIN_CARD}); // 
                } else {

                    var query = {};
                    
                    query = {$or:[{user_id: req.body.user_id, type: type},{user_id: req.body.user_id, type: {$exists: false}}]};
                    
                    Card.find(query).then((card) => { 
                        var PAYMENT_TYPES = utils.PAYMENT_TYPES();
                        var wallet = 0;
                        var wallet_currency_code = "";
                        var is_use_wallet = false;
                        try {
                            wallet = detail.wallet;
                            wallet_currency_code = detail.wallet_currency_code;
                            is_use_wallet = detail.is_use_wallet;
                        } catch (error) {
                            console.error(error);

                        }
                        if (type == Number(constant_json.USER_UNIQUE_NUMBER)) {
                            res.json({
                                success: true,
                                message: success_messages.MESSAGE_CODE_GET_ALL_CARD_SUCCESSFULLY,
                                wallet: wallet,
                                wallet_currency_code: wallet_currency_code,
                                is_use_wallet: is_use_wallet,
                                payment_gateway: PAYMENT_TYPES,
                                card: card
                            });
                        } else
                        {
                            res.json({
                                success: true,
                                message: success_messages.MESSAGE_CODE_GET_ALL_CARD_SUCCESSFULLY,
                                wallet: wallet,
                                wallet_currency_code: wallet_currency_code,
                                payment_gateway: PAYMENT_TYPES,
                                card: card
                            });
                        }

                        

                    });
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};


exports.delete_card = function (req, res) {

    utils.check_request_params(req.body, [{name: 'user_id', type: 'string'},{name: 'card_id', type: 'string'},
        {name: 'token', type: 'string'}], function (response) {
        if (response.success) {
            var type = Number(req.body.type);
            switch (type) {
                case Number(constant_json.USER_UNIQUE_NUMBER):
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
                case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                Table = Provider;
                break;
                case Number(constant_json.CORPORATE_UNIQUE_NUMBER):
                type = Number(constant_json.CORPORATE_UNIQUE_NUMBER);
                Table = Corporate;
                break;
                default:
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                Table = User;
                break;
            }
            Table.findOne({_id: req.body.user_id}).then((detail) => { 
                if (detail) {
                    if (req.body.token !== null && detail.token !== req.body.token)
                    {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else
                    {
                        if (type == Number(constant_json.USER_UNIQUE_NUMBER)) {
                            var query = {$or:[{_id :detail.current_trip_id ,payment_mode:Number(constant_json.PAYMENT_MODE_CARD)},{user_id: detail._id, is_pending_payments: 1 }]};
                            
                            Trip.find(query).then((trips) => { 

                                if (trips.length > 0) {
                                    res.json({success: false, error_code: error_message.ERROR_CODE_YOUR_TRIP_PAYMENT_IS_PENDING});
                                } else {
                                    Card.remove({_id: req.body.card_id, $or :  [{type: type}, { type: {$exists: false} }], user_id: req.body.user_id}).then(() => { 
                                        
                                            res.json({success: true, message: success_messages.MESSAGE_CODE_YOUR_CARD_DELETED_SUCCESSFULLY});
                                        
                                    });
                                }
                            });
                        } else
                        {
                            Card.remove({_id: req.body.card_id, $or :  [{type: type}, { type: {$exists: false} }], user_id: req.body.user_id}).then(() => { 
                                
                                    res.json({success: true, message: success_messages.MESSAGE_CODE_YOUR_CARD_DELETED_SUCCESSFULLY});
                                
                            });
                        }
                    }
                } else
                {
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};


////////////// CARD SELECTION  //////////////
exports.card_selection = function (req, res) {

    utils.check_request_params(req.body, [{name: 'card_id', type: 'string'}], function (response) {
        if (response.success) {
            var type = Number(req.body.type);
            switch (type) {
                case Number(constant_json.USER_UNIQUE_NUMBER):
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                break;
                case Number(constant_json.PROVIDER_UNIQUE_NUMBER):
                type = Number(constant_json.PROVIDER_UNIQUE_NUMBER);
                break;
                default:
                type = Number(constant_json.USER_UNIQUE_NUMBER);
                break;
            }

            Card.findOne({_id: req.body.card_id, $or :  [{type: type}, { type: {$exists: false} }], user_id: req.body.user_id}).then((card) => { 

                if (!card) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_CARD_NOT_FOUND});
                } else {
                    card.is_default = constant_json.YES;
                    card.save().then(() => { 

                        Card.findOneAndUpdate({_id: {$nin: req.body.card_id}, $or :  [{type: type}, { type: {$exists: false} }], user_id: req.body.user_id, is_default: constant_json.YES}, {is_default: constant_json.NO}).then((card) => { 
                            
                            
                            res.json({success: true, message: success_messages.MESSAGE_CODE_YOUR_GET_YOUR_SELECTED_CARD, card: card});
                            
                        });
                    }, (err) => {
                        console.log(err)
                        res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                    });
                    });
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};
////////////// CARD DE SELECTION  //////////////
exports.card_deselect = function (req, res) {

    utils.check_request_params(req.body, [{name: 'card_id', type: 'string'}], function (response) {
        if (response.success) {
            Card.findOne({_id: req.body.card_id, user_id: req.body.user_id}).then((card) => { 

                if (!card) {
                    res.json({success: false, error_code: error_message.ERROR_CODE_CARD_NOT_FOUND});
                } else {

                    card.is_default = constant_json.NO;
                    card.save().then(() => { 
                        res.json({
                            success: true, message: success_messages.MESSAGE_CODE_YOUR_CARD_DESELECTED, card: card
                        });
                    }, (err) => {
                        console.log(err)
                        res.json({
                                        success: false,
                                        error_code: error_message.ERROR_CODE_SOMETHING_WENT_WRONG
                                    });
                    });
                }
            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });
};

/////////////// USER CHANGE PAYMENT TYPE  
exports.change_paymenttype = function (req, res) {

    utils.check_request_params(req.body, [{name: 'trip_id', type: 'string'}], function (response) {
        if (response.success) {
            User.findOne({_id: req.body.user_id}).then((user) => { 
                if (user)
                {
                    if (req.body.token != null && user.token != req.body.token) {
                        res.json({success: false, error_code: error_message.ERROR_CODE_INVALID_TOKEN});
                    } else
                    {
                        var payment_type = req.body.payment_type;
                        var trip_id = req.body.trip_id;
                        if (payment_type == Number(constant_json.PAYMENT_MODE_CARD)) {
                            Trip.findOne({_id: req.body.trip_id}).then((trip) => { 
                                var user_id = trip.user_id;
                                if(trip.trip_type == constant_json.TRIP_TYPE_CORPORATE){
                                    user_id = trip.user_type_id;
                                }
                                Card.find({user_id: user_id}).then((card) => { 

                                    if (card.length == 0) {
                                        res.json({success: false, error_code: error_message.ERROR_CODE_ADD_CREDIT_CARD_FIRST});
                                    } else {


                                            trip.payment_mode = req.body.payment_type;
                                            trip.save();
                                            Provider.findOne({_id: trip.confirmed_provider}).then((provider) => { 

                                                var device_token = provider.device_token;
                                                var device_type = provider.device_type;
                                                utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PAYMENT_MODE_CARD, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                                utils.update_request_status_socket(trip._id);
                                                res.json({success: true, message: success_messages.MESSAGE_CODE_YOUR_PAYMEMT_MODE_CHANGE_SUCCESSFULLY});
                                            });
                                    }
                                });

                            });
                        } else {
                            Trip.findOne({_id: req.body.trip_id}).then((trip) => { 
                                trip.payment_mode = req.body.payment_type;
                                trip.save();
                                Provider.findOne({_id: trip.confirmed_provider}).then((provider) => { 
                                    var device_token = provider.device_token;
                                    var device_type = provider.device_type;
                                    utils.sendPushNotification(constant_json.PROVIDER_UNIQUE_NUMBER, device_type, device_token, push_messages.PUSH_CODE_FOR_PAYMENT_MODE_CASH, constant_json.PUSH_NOTIFICATION_SOUND_FILE_IN_IOS);
                                    utils.update_request_status_socket(trip._id);
                                    res.json({success: true, message: success_messages.MESSAGE_CODE_YOUR_PAYMEMT_MODE_CHANGE_SUCCESSFULLY});
                                });
                            });
                        }
                    }
                } else
                {
                    res.json({success: false, error_code: error_message.ERROR_CODE_USER_DETAIL_NOT_FOUND});
                }

            });
        } else {
            res.json({
                success: false,
                error_code: response.error_code,
                error_description: response.error_description
            });
        }
    });

};