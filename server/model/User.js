const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    isPremium: { type: Boolean, default: false },
    premiumExpiresAt: { type: Date }
});

module.exports = mongoose.model('User', userSchema);

