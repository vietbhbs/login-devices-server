const User = require("../models/userModel");
const Device = require("../models/deviceModel");
const bcrypt = require("bcrypt");
const {disconnect, disconnectSockets, on} = require("socket.io");
const io = require("nodemon");
const authMethod = require("../models/methodsModel");
const socket = require("./userController");

const jwt = require('jsonwebtoken');
const promisify = require('util').promisify;
const randToken = require('rand-token');
const sign = promisify(jwt.sign).bind(jwt);
const verify = promisify(jwt.verify).bind(jwt);
const jwtVariable = require('../variables/jwt');

module.exports.login = async (req, res, next) => {
    try {
        // check account
        const {username, password} = req.body;
        const user = await User.findOne({username});

        if (!user) return res.json({msg: "Incorrect Username or Password", status: false});
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) return res.json({msg: "Incorrect Username or Password", status: false});

        const accessTokenLife = process.env.ACCESS_TOKEN_LIFE;
        const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET;

        const dataForAccessToken = {
            username: user.username,
        };

        const accessToken = await authMethod.generateToken(
            dataForAccessToken,
            accessTokenSecret,
            accessTokenLife,
        );

        if (!accessToken) {
            return res
                .status(401)
                .send('Đăng nhập không thành công, vui lòng thử lại.');
        }

        let refreshToken = randToken.generate(jwtVariable.refreshTokenSize); // tạo 1 refresh token ngẫu nhiên

        if (!user.refreshToken) {
            await User.findByIdAndUpdate(
                user.id,
                {
                    refreshToken: refreshToken,
                    accessToken: accessToken
                },
                {new: true}
            );
        } else {
            // Nếu user này đã có refresh token thì lấy refresh token đó từ database
            await User.findByIdAndUpdate(
                user.id,
                {
                    accessToken: accessToken
                },
                {new: true}
            );

        }

        return res.json({
            status: true,
            user
        });
    } catch (ex) {
        next(ex);
    }
};

module.exports.register = async (req, res, next) => {
    try {
        const {username, email, password} = req.body;
        const usernameCheck = await User.findOne({username});
        if (usernameCheck)
            return res.json({msg: "Username already used", status: false});
        const emailCheck = await User.findOne({email});
        if (emailCheck)
            return res.json({msg: "Email already used", status: false});
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            email,
            username,
            password: hashedPassword,
        });
        delete user.password;
        // save user device
        const userAgent = req.headers['user-agent'] ? req.headers['user-agent'] : '';
        const deviceName = req.device.type + '-' + userAgent
        const device = await Device.create({
            deviceName,
            email
        })
        return res.json({status: true, user, device});
    } catch (ex) {
        next(ex);
    }
};

module.exports.getAllUsers = async (req, res, next) => {
    try {
        const accessTokenFromHeader = req.headers.x_authorization;
        console.log(accessTokenFromHeader);
        if (!accessTokenFromHeader) {
            return res.status(401).send('Không tìm thấy access token!');
        }
        const users = await User.find({_id: {$ne: req.params.id}}).select([
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

module.exports.logOut = (req, res, next) => {
    try {
        if (!req.params.id) return res.json({msg: "User id is required "});
        onlineUsers.delete(req.params.id);
        return res.status(200).send();
    } catch (ex) {
        next(ex);
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

