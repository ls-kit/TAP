var User = require('mongoose').model('User');
var crypto = require('crypto');
var utils = require('../controllers/utils');
var allemails = require('../controllers/emails');
var moment = require('moment');
var nodemailer = require('nodemailer');
var Setting = require('mongoose').model('Settings');
var Provider = require('mongoose').model('Provider');
var Trip = require('mongoose').model('Trip');
var Trip_Service = require('mongoose').model('trip_service');
var Trip_Location = require('mongoose').model('trip_location');
var Country = require('mongoose').model('Country');
var City = require('mongoose').model('City');
var Card = require('mongoose').model('Card');
var Partner = require('mongoose').model('Partner');
var console = require('../controllers/console');
var fs = require("fs");

exports.partner_payments = function (req, res, next) {
    if (typeof req.session.partner != "undefined")
    {
        Card.find({user_id: req.session.partner._id, is_default: 1}).then((card) => {
            Partner.findOne({_id: req.session.partner._id}).then((partner_detail) => {
                Card.find({user_id: req.session.partner._id, is_default: 0}).then((cards) => {
                    res.render("partner_payments", {Selected_card: card,Other_card: cards, partner_detail: partner_detail, partner_id: req.session.partner._id,  stripe_public_key: setting_detail.stripe_publishable_key});
                    delete message;
                });
            });
        });
    } else
    {
        res.redirect('/partner_login');
    }

};

exports.check_card = function (req, res) {
    Card.find({user_id: req.body.user_id}).then((card) => {
        if (card.length == 0) {
            res.json({success: false});
        } else {
            res.json({success: true});
        }
    });
}

exports.card_type = function (req, res) {
    if (typeof req.session.partner != "undefined")
    {
        var Card_number = req.body.Card_number;
        Card_number = Card_number.replace(/ /g, '')
        var creditCardType = require('credit-card-type');
        var visaCards = creditCardType(Card_number);
        res.json(visaCards[0]);
    } else
    {
        res.redirect('/partner_login');
    }
}

exports.add_card = function (req, res) {
    if (typeof req.session.partner != "undefined")
    {
        Partner.findOne({_id: req.session.partner._id}).then((partner) => {

                var stripe_secret_key = setting_detail.stripe_secret_key;
                var stripe = require("stripe")(stripe_secret_key);
            if(!partner.customer_id){
                stripe.customers.create({
                    payment_method: req.body.payment_method,
                    email: partner.email,
                    name: partner.name,
                    phone: partner.phone
                }, function (err, customer) {
                    partner.customer_id = customer.id;
                    partner.save();
                });
            } else {
                stripe.paymentMethods.attach(req.body.payment_method,
                    {
                        customer: partner.customer_id,
                    }, function (err, customer) {
                    
                });
            }

            stripe.paymentMethods.retrieve(
                req.body.payment_method,
            (err, paymentMethod)=> {
                Card.find({user_id: req.session.partner._id}).then((card_data) => {

                    var card = new Card({
                        payment_id: req.body.payment_id,
                        user_id: req.session.partner._id,
                        type: req.body.type,
                        token: req.body.token,
                        last_four: paymentMethod.card.last4,
                        payment_method: req.body.payment_method,
                        card_type: paymentMethod.card.brand,
                    });
                    if (card_data.length > 0) {
                        card.is_default = constant_json.NO;
                        card.save();
                    } else {
                        card.is_default = constant_json.YES;
                        card.save();
                    }
                    card.save().then(() => {
                        message = admin_messages.success_message_add_card;
                        res.redirect('/partner_payments');
                    });

                });
            });
                
        });
    } else
    {
        res.redirect('/partner_login');
    }
};

exports.delete_card = function (req, res) {
    if (typeof req.session.partner != "undefined")
    {
        Card.remove({_id: req.body.card_id, user_id: req.session.partner._id}).then((card) => {
            
            if (req.body.is_default == 1)
            {
                Card.findOneAndUpdate({user_id: req.session.partner._id}, {is_default: constant_json.YES}).then((card) => {

                })
            }
            res.json({success: true});
               
        });

    } else
    {
        res.redirect('/partner_login');
    }
};

exports.card_selection = function (req, res) {
    if (typeof req.session.partner != "undefined")
    {
        Card.findOneAndUpdate({_id: req.body.card_id, user_id: req.session.partner._id}, {is_default: constant_json.YES}).then((card) => {

            Card.findOneAndUpdate({_id: {$nin: req.body.card_id}, user_id: req.session.partner._id, is_default: constant_json.YES}, {is_default: constant_json.NO}).then((card) => {
                    res.json({success: true});
            });

        });
    } else
    {
        res.redirect('/partner_login');
    }
};

exports.partner_add_wallet_amount = function (req, res, next) {
    var type = Number(req.body.type);
    Partner.findOne({_id: req.session.partner._id}, function (err, detail) {
        var payment_id = req.body.payment_id;
        
        switch (payment_id) {
            case Number(constant_json.PAYMENT_BY_STRIPE):
                break;
            case Number(constant_json.PAYMENT_BY_PAYPAL):
                break;
        }

        var stripe_secret_key = setting_detail.stripe_secret_key;

        var stripe = require("stripe")(stripe_secret_key);
        stripe.paymentIntents.retrieve(req.body.payment_intent_id, function(error, intent){

            if(intent && intent.charges && intent.charges.data && intent.charges.data.length>0) {
                var total_wallet_amount = utils.addWalletHistory(type, detail.unique_id, detail._id, detail.country_id, detail.wallet_currency_code, detail.wallet_currency_code,
                        1, (intent.charges.data[0].amount/100), detail.wallet, constant_json.ADD_WALLET_AMOUNT, constant_json.ADDED_BY_CARD, "Card : "+intent.charges.data[0].payment_method_details.card.last4)

                detail.wallet = total_wallet_amount;
                detail.save().then(() => { 
                    message = "Wallet Amount Added Sucessfully.";
                    res.redirect('/partner_payments');
                }, (err) => {
                    utils.error_response(err, res)
                });

            } else {
                message = "Add wallet Failed";
                res.redirect('/partner_payments');
            }                
        });

    });
};
