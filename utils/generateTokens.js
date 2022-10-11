const jwt = require("jsonwebtoken");
const deviceModel = require("../models/deviceModel");

module.exports.generateTokens = async (user, deviceName) => {
    try {
        const payload = { _id: user._id };
        const accessToken = jwt.sign(
            payload,
            process.env.ACCESS_TOKEN_PRIVATE_KEY,
            { expiresIn: "24h" }
        );
        const refreshToken = jwt.sign(
            payload,
            process.env.REFRESH_TOKEN_PRIVATE_KEY,
            { expiresIn: "7d" }
        );

        const device = await deviceModel.findOne({ userId: user._id, deviceName: deviceName});
        if (device) await device.remove();

        await new deviceModel({ userId: user._id, token: refreshToken, deviceName: deviceName}).save();
        return Promise.resolve({ accessToken, refreshToken });
    } catch (err) {
        return Promise.reject(err);
    }
};