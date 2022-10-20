const User = require("../models/userModel");
const Device = require("../models/deviceModel");
const bcrypt = require("bcrypt");
const authMethod = require("../models/methodsModel");
const deviceModel = require("../models/deviceModel");

const jwt = require('jsonwebtoken');
const promisify = require('util').promisify;
// const randToken = require('rand-token');
const macaddress = require('macaddress')
const jwtVariable = require('../variables/jwt');
const {
    signUpBodyValidation,
    logInBodyValidation,
    checkLoginDevices,
    refreshTokenBodyValidation
} = require("../utils/validationSchema");
const {generateTokens} = require("../utils/generateTokens");
const {verifyRefreshToken} = require("../utils/refreshToken");

module.exports.login = async (req, res, next) => {
    try {
        const {error} = logInBodyValidation(req.body);

        if (error) {
            return res.status(400)
                .json({error: true, message: error.details[0].message});
        }

        const user = await User.findOne({email: req.body.email});

        if (!user) {
            return res.status(401)
                .json({error: true, message: "Invalid email or password"});
        }

        const verifiedPassword = await bcrypt.compare(
            req.body.password,
            user.password
        );

        if (!verifiedPassword) {
            return res.status(401)
                .json({error: true, message: "Invalid email or password"});
        }

        // save user device
        let macAdress = '';
        macaddress.one(function (err, mac) {
            macAdress = mac;
        });

        const devicesAvailable = await checkLoginDevices(user['_id'].toString());

        if (devicesAvailable.length >= 3) {
            return res.status(401)
                .json({error: true, message: "Limit devices logged"});
        }

        const {accessToken, refreshToken} = await generateTokens(user, req.device.type + macAdress, macAdress);

        res.status(200).json({
            error: false,
            accessToken,
            refreshToken,
            message: "Logged in successfully",
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({error: true, message: "Internal Server Error"});
    }
};

module.exports.register = async (req, res, next) => {
    try {
        const {error} = signUpBodyValidation(req.body);

        if (error) {
            return res.status(400)
                .json({error: true, message: error.details[0].message});
        }

        const user = await User.findOne({email: req.body.email});

        if (user) {
            return res.status(400)
                .json({error: true, message: "User with given email already exist"});
        }

        const salt = await bcrypt.genSalt(Number(process.env.SALT));
        const hashPassword = await bcrypt.hash(req.body.password, salt);

        await new User({...req.body, password: hashPassword}).save();

        res.status(201)
            .json({error: false, message: "Account created successfully"});
    } catch (err) {
        console.log(err);
        res.status(500).json({error: true, message: "Internal Server Error"});
    }
};

module.exports.getAllUsers = async (req, res, next) => {
    try {
        const users = await User.find().select([
            "email",
            "username",
            "avatarImage",
            "_id",
        ]);
        return res.json(users);
    } catch (ex) {
        next(ex);
    }
};

module.exports.setAvatar = async (req, res, next) => {
    try {
        const userId = req.params.id;
        const avatarImage = req.body.image;
        const userData = await User.findByIdAndUpdate(
            userId,
            {
                isAvatarImageSet: true,
                avatarImage,
            },
            {new: true}
        );
        return res.json({
            isSet: userData.isAvatarImageSet,
            image: userData.avatarImage,
        });
    } catch (ex) {
        next(ex);
    }
};

module.exports.logOut = async (req, res, next) => {
    try {
        const {error} = refreshTokenBodyValidation(req.body);

        if (error) {
            return
        }

        let device = await deviceModel.findOne({refreshToken: req.body.refreshToken});
        let isDelete = await deviceModel.deleteOne({refreshToken: req.body.refreshToken});

        if (isDelete.deletedCount > 0) {
            return
        }

        if (req.path === '/logout-all') {
            const userId = device['userId']
            isDelete = await deviceModel.deleteMany({userId: userId});
        }

        if (isDelete.deletedCount > 0) {
            return
        }

        return req.body.refreshToken
    } catch (err) {
        console.log(err);
    }
};

module.exports.freshToken = async (req, res) => {
    const {error} = refreshTokenBodyValidation(req.body);
    if (error) {
        return res.status(400)
            .json({error: true, message: error.details[0].message});
    }

    verifyRefreshToken(req.body.refreshToken)
        .then(({tokenDetails}) => {
            const payload = {_id: tokenDetails._id,};
            const accessToken = jwt.sign(
                payload,
                process.env.ACCESS_TOKEN_PRIVATE_KEY,
                {expiresIn: "24h"}
            );
            res.status(200).json({
                error: false,
                accessToken,
                message: "Access token created successfully",
            });
        })
        .catch((err) => res.status(400).json(err));
}

module.exports.getAllDevices = async (req, res) => {
    const accessToken = req.body.accessToken;

    if (!accessToken) {
        return res.status(400)
            .json({error: true, message: 'access token not valid'});
    }
    const device = await deviceModel.findOne({accessToken: accessToken});

    if (!device.userId){
        return res.status(400)
            .json({error: true, message: 'Devices is not available'});
    }
    const userId = device.userId ? device.userId: ''
    const user = await User.findById(userId)
        .select('username email');
    const devices = await deviceModel.find({userId: userId})
        .select('deviceName refreshToken accessToken');

    return res.status(200).json({
        error: false,
        data: devices,
        user: user
    });

}


