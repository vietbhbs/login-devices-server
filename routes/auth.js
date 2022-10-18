const {
    login,
    register,
    getAllUsers,
    setAvatar,
    logOut,
    disconnect,
    freshToken
} = require("../controllers/userController");

const {auth} = require("../middleware/auth");
const router = require("express").Router();

router.post("/login", login);
router.post("/register", register);
router.get("/users/", auth, getAllUsers);
router.post("/setavatar/:id", setAvatar);
router.post("/logout", logOut);
router.post("/logout-all", logOut);
router.get("/disconnect", disconnect);
router.post("/refresh-token", freshToken);

module.exports = router;
