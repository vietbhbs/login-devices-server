const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
    },
    accessToken: {
        type: String,
        default: ''
    },
    refreshToken: {
        type: String,
        default: ''
    },
    isLogin: {
        type: Boolean
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7 * 86400
    }
});

module.exports = mongoose.model("Devices", deviceSchema);
