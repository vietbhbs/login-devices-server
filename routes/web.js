// const {auth} = require("../middleware/auth");
// const {login} = require("../middleware/auth");
const {checkToken} = require("../middleware/auth");
const router = require("express").Router();

router.get("/", (req, res, next) => {
    res.sendFile(__dirname.substring(0, __dirname.lastIndexOf("routes")) + 'resource/homepage.html');
})

router.get("/login", (req, res, next) => {
    res.sendFile(__dirname.substring(0, __dirname.lastIndexOf("routes")) + 'resource/login.html');
});

router.post("/verify-token", checkToken);

module.exports = router;
