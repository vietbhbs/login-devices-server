const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const deviceSchema = new mongoose.Schema({
    deviceName: {
        type: String,
        required: true,
    },
    mac: {
        type: String,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
    },
    refreshToken: {
        type: String,
        required: true
    },
    accessToken: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 7 * 86400
    }
});

module.exports = mongoose.model("Devices", deviceSchema);
