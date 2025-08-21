const express = require("express");
const app = express();
const morgan = require("morgan");
const { readdirSync } = require("fs"); //ใช้สําหรับอ่านไฟล์ในโฟลเดอร์ (อ่านไฟล์ directory)
const cors = require("cors"); //ใช้สําหรับการเชื่อมต่อระหว่าง server กับ client

// const authRouter = require("./routers/auth");
// const authCategory = require("./routers/category");

//middleware
app.use(morgan("dev")); //dev,combined,tiny
app.use(express.json({ limit: "20mb" })); //ใช้สําหรับรับข้อมูลจาก clientว่าขนาดเท่าไร
app.use(cors());

//router
// app.use("/api", authRouter);
// app.use("/api", authCategory);

readdirSync("./routers").map((c) => {
  app.use("/api", require("./routers/" + c));
}); //อ่านไฟล์ในโฟลเดอร์

app.post("/api", (req, res) => {
  //business logic callback fuction
  const { email, password } = req.body; //restructuring คือการประกาศตัวแปรให้มีชื่อเดียวกับ key ที่ส่งมา
  console.log(email, password);
  res.send("Hello world");
});

//start server
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
