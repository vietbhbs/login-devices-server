const jwt = require("jsonwebtoken");

module.exports.auth = async (req, res, next) => {
    const token = req.header("x-access-token");

    if (!token) {
        return res
            .status(403)
            .json({error: true, message: "Access Denied: No token provided"});
    }

    try {
        const tokenDetails = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_PRIVATE_KEY
        );
        req.user = tokenDetails;
        next();
    } catch (err) {
        console.log(err);
        res.status(403)
            .json({error: true, message: "Access Denied: Invalid token"});
    }
};

module.exports.checkToken = async (req, res) => {
    const token = req.body.token;

    if (!token) {
        return res
            .status(403)
            .json({error: true, message: "Access Denied: No token provided"});
    }

    try {
        const tokenDetails = jwt.verify(
            token,
            process.env.ACCESS_TOKEN_PRIVATE_KEY
        );

        res.status(200)
            .json({error: true, data: {token: tokenDetails}});
    } catch (err) {
        console.log(err);
        res.status(403)
            .json({error: true, message: "Access Denied: Invalid token"});
    }
}

// module.exports.login = async (req, res, next) => {
//     const token = req.header("x-access-token") ? sessionStorage.getItem('nodejs-login-token') : '';
//
//     if (token){
//         res.redirect('/');
//     }
//
//     next();
// }
