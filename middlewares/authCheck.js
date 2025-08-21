const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");
exports.authCheck = async (req, res, next) => {
  //check token ว่าส่งมาถูกมั้ย
  try {
    const headerToken = req.headers.authorization;

    if (!headerToken) {
      return res.status(401).json({ message: "No Token, Authorization" });
    }

    const token = headerToken.split(" ")[1];

    const decode = jwt.verify(token, process.env.SECRET); //secret ต้องตรงกับหน้า login
    req.user = decode; //req เป็น Object user คือ Key ที่เพิ่มเข้าไป รับแบบนี้เพื่อให้มันส่งค่าไปทุกหน้า

    const user = await prisma.user.findFirst({
      where: {
        email: req.user.email,
      },
    });

    if (!user.enabled) {
      return res.status(400).json({ message: "This account connot access" });
    }

    next(); //continue
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Token Invalid" });
  }
};

exports.adminCheck = async (req, res, next) => {
  try {
    const { email } = req.user; //enpoint ที่มีใช้ middleware ต้องใช้เป็น req.user

    const adminUser = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!adminUser || adminUser.role !== "admin") {
      return res.status(403).json({ message: "Access denied : Admin Only" });
    }

    next();
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error Admin access denied" });
  }
};
