const Joi = require("joi");
const passwordComplexity = require("joi-password-complexity");
const Device = require("../models/deviceModel");

const signUpBodyValidation = (body) => {
    const schema = Joi.object({
        username: Joi.string().required().label("User Name"),
        email: Joi.string().email().required().label("Email"),
        password: passwordComplexity().required().label("Password"),
    });
    return schema.validate(body);
};

const logInBodyValidation = (body) => {
    const schema = Joi.object({
        email: Joi.string().email().required().label("Email"),
        password: Joi.string().required().label("Password"),
    });
    return schema.validate(body);
};

const refreshTokenBodyValidation = (body) => {
    const schema = Joi.object({
        refreshToken: Joi.string().required().label("Refresh Token"),
    });
    return schema.validate(body);
};

const checkLoginDevices = async (userId) => {
    const countDevice = await Device.findOne({userId: userId})
        .distinct('deviceName');

    return await countDevice;
};

module.exports = {
    signUpBodyValidation,
    logInBodyValidation,
    refreshTokenBodyValidation,
    checkLoginDevices
}