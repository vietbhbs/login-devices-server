const User = require("../models/userModel");
const Device = require("../models/deviceModel");
const bcrypt = require("bcrypt");
const {disconnect, disconnectSockets, on} = require("socket.io");
const io = require("nodemon");
const authMethod = require("../models/methodsModel");
const socket = require("./userController");
const deviceModel = require("../models/deviceModel");

const jwt = require('jsonwebtoken');
const promisify = require('util').promisify;
// const randToken = require('rand-token');
const macaddress = require('macaddress')
const sign = promisify(jwt.sign).bind(jwt);
const verify = promisify(jwt.verify).bind(jwt);
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
        let deviceName = '';
        macaddress.one(function (err, mac) {
            deviceName = req.device.type + '-' + mac;

        });

        const devicesAvailable = await checkLoginDevices(user['_id'].toString());

        if (devicesAvailable.length >= 3) {
            return res.status(401)
                .json({error: true, message: "Limit devices logged"});
        }

        const {accessToken, refreshToken} = await generateTokens(user, deviceName);

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
            return res
                .status(400)
                .json({error: true, message: error.details[0].message});
        }

        let device = await deviceModel.findOne({token: req.body.refreshToken});
        let isDelete = await deviceModel.deleteOne({token: req.body.refreshToken});

        if (!isDelete.deletedCount){
            return res
                .status(400)
                .json({error: true, message: "Logout single failed"});
        }

        if (req.path === '/logout-all') {
            const userId = device['userId']
            isDelete = await deviceModel.deleteMany({userId: userId});
        }

        if (!isDelete.deletedCount){
            return res
                .status(400)
                .json({error: true, message: "Logout multi failed"});
        }

        res.status(200).json({error: false, message: "Logged Out Successfully"});
    } catch (err) {
        console.log(err);
        res.status(500).json({error: true, message: "Internal Server Error"});
    }
};

module.exports.disconnect = async (req, res, next) => {
    try {
        const accessTokenFromHeader = req.headers.x_authorization;
        if (!accessTokenFromHeader) {
            return res.status(401).send('Không tìm thấy access token!');
        }
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

        const verified = await authMethod.verifyToken(
            accessTokenFromHeader,
            accessTokenSecret,
        );
        console.log(verified);
        if (!verified) {
            return res
                .status(401)
                .send('Bạn không có quyền truy cập vào tính năng này!');
        }
        await User.findByIdAndUpdate(
            req.params.id,
            {
                accessToken: accessToken
            },
            {new: true}
        );
        onlineUsers.delete(req.params.id);
        return res.status(200).send();

    } catch (ex) {
        next(ex);
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


