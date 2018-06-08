var mongoose = require('mongoose');

var categorySchema = new mongoose.Schema({
    "类目名": { type: String, unique: true, required: true },
    "权重": { type: Number, min: 1, required: true }, // 整数，越大越前
});

module.exports = categorySchema;