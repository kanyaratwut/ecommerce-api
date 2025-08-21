//controllers เป็นที่สำหรับเขียน function
const prisma = require("../config/prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Email is required!" });
    }

    if (!password) {
      return res.status(400).json({ message: "Password is required!" });
    }

    //Check Email in DB already?
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      return res.status(400).json({ message: "Email already exists!" });
    }

    //Hash Password
    const hasPassword = await bcrypt.hash(password, 10);

    //Register create in DB
    await prisma.user.create({
      data: {
        email: email,
        password: hasPassword,
      },
    });

    res.send("Register Success");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // check email in DB
    const user = await prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (!user || !user.enabled) {
      return res.status(400).json({ message: "User Not Found or Not Enabled" });
    }
    // check password in DB
    const isMatch = await bcrypt.compare(password, user.password); // (password จาก user กรอกมา , Password ใน DB)

    if (!isMatch) {
      return res.status(400).json({ message: "Password Incorrect" });
    }
    // create payload
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    // generate token

    jwt.sign(payload, process.env.SECRET, { expiresIn: "1d" }, (err, token) => {
      if (err) {
        return res.status(500).json({ message: "Server Error" });
      }

      res.json({ payload, token }); //res ออกไปได้แค่อันเดียว
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.currentUser = async (req, res) => {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: req.user.email,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });
    res.json({ user });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
