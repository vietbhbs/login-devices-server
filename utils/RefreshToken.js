const jwt = require("jsonwebtoken");
const userToken = require("../models/deviceModel");

module.exports.verifyRefreshToken = (refreshToken) => {
    const privateKey = process.env.REFRESH_TOKEN_PRIVATE_KEY;

    return new Promise((resolve, reject) => {
        userToken.findOne({ token: refreshToken }, (err, doc) => {
            if (!doc)
                return reject({ error: true, message: "Invalid refresh token" });

            jwt.verify(refreshToken, privateKey, (err, tokenDetails) => {
                if (err)
                    return reject({ error: true, message: "Invalid refresh token" });
                resolve({
                    tokenDetails,
                    error: false,
                    message: "Valid refresh token",
                });
            });
        });
    });
};