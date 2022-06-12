var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var carCategoriesSchema = new Schema({
    title: {type: String, default: ""},
    list: {type: Array, default: []},
});
carCategoriesSchema.index({title: 1}, {background: true});

var CarCategories = mongoose.model('car_categories', carCategoriesSchema);
module.exports = CarCategories;