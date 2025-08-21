const express = require("express");
const router = express.Router();
const { authCheck, adminCheck } = require("../middlewares/authCheck");
const {
  listUsers,
  changeStatus,
  changeRole,
  userCart,
  getUserCart,
  emptyCart,
  saveAdress,
  saveOrder,
  getOrder,
} = require("../controllers/user");
const { user } = require("../config/prisma");

//@ENDPOINT http://localhost:5000/api/users
//admin
router.get("/users", authCheck, adminCheck, listUsers); //เมื่อเข้า endpoint นี้จะเข้า authCheck ก่อน ต่อมาเข้า adminCheck จากนั้นจะเข้า listUsers
router.post("/change-status", authCheck, adminCheck, changeStatus);
router.post("/change-role", authCheck, adminCheck, changeRole);

//user
router.post("/user/cart", authCheck, userCart);
router.get("/user/cart", authCheck, getUserCart);
router.delete("/user/cart", authCheck, emptyCart);

router.post("/user/address", authCheck, saveAdress);

router.post("/user/order", authCheck, saveOrder);
router.get("/user/order", authCheck, getOrder);

module.exports = router;
