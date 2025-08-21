const express = require("express");
const router = express.Router();
const {
  create,
  update,
  list,
  read,
  remove,
  listby,
  searchFilters,
  createImages,
  removeImage,
} = require("../controllers/product");

const { authCheck, adminCheck } = require("../middlewares/authCheck");

//@ENDPOINT http://localhost:5000/api/product
router.post("/product", create);
router.put("/product/:id", update);
router.get("/product/:id", read);
router.get("/products/:count", list);
router.delete("/product/:id", remove);
router.post("/productby", listby);
router.post("/search/filters", searchFilters);

router.post("/images", authCheck, adminCheck, createImages);
router.post("/removeimages", authCheck, adminCheck, removeImage);

module.exports = router;
