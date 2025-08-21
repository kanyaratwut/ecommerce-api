const prisma = require("../config/prisma");
const cloudinary = require("cloudinary").v2;

// Configuration
cloudinary.config({
  cloud_name: process.env.CLOUNDINARY_CLOUND_NAME,
  api_key: process.env.CLOUNDINARY_API_KEY,
  api_secret: process.env.CLOUNDINARY_API_SECRET,
});

exports.create = async (req, res) => {
  try {
    const { title, description, price, quantity, categoryId, images } =
      req.body;

    const product = await prisma.product.create({
      data: {
        title: title,
        description: description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        categoryId: parseInt(categoryId),
        images: {
          create: images.map((image) => ({
            asset_id: image.asset_id,
            public_id: image.public_id,
            url: image.url,
            secure_url: image.secure_url,
          })),
        },
      },
    });
    res.send(product);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.update = async (req, res) => {
  try {
    const { title, description, price, quantity, categoryId, images } =
      req.body;

    // clear image in DB before update
    await prisma.image.deleteMany({
      where: {
        productId: Number(req.params.id),
      },
    });

    const product = await prisma.product.update({
      where: {
        id: Number(req.params.id),
      },
      data: {
        title: title,
        description: description,
        price: parseFloat(price),
        quantity: parseInt(quantity),
        categoryId: parseInt(categoryId),
        images: {
          create: images.map((image) => ({
            asset_id: image.asset_id,
            public_id: image.public_id,
            url: image.url,
            secure_url: image.secure_url,
          })),
        },
      },
    });
    res.send(product);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.list = async (req, res) => {
  try {
    const { count } = req.params;
    const products = await prisma.product.findMany({
      take: parseInt(count),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        // include การ join table
        category: true,
        images: true,
      },
    });
    res.send(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.read = async (req, res) => {
  try {
    const { id } = req.params;
    const products = await prisma.product.findFirst({
      where: {
        id: Number(id),
      },
      include: {
        category: true,
        images: true,
      },
    });
    res.send(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;

    //find product for include images
    const product = await prisma.product.findFirst({
      where: {
        id: Number(id),
      },
      include: {
        images: true,
      },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    //Promise all ใช้สําหรับรอรับค่าจากฟังก์ชัน (รอครบทุกฟังก์ชัน) แล้วทํางานต่อ (delete image in cloudinary)
    const deletedImages = product.images.map(
      async (image) =>
        new Promise((resolve, reject) => {
          // delete image in cloudinary
          cloudinary.uploader.destroy(image.public_id, (error, result) => {
            if (error) reject(error);
            else resolve(result);
          });
        })
    );

    await Promise.all(deletedImages);

    //delete product in db
    await prisma.product.delete({
      where: {
        id: Number(id),
      },
    });
    res.send("Delete Success");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.listby = async (req, res) => {
  try {
    const { sort, order, limit } = req.body;
    const products = await prisma.product.findMany({
      take: limit,
      orderBy: {
        [sort]: order,
      },
      include: {
        category: true,
        images: true,
      },
    });
    res.send(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

const handleQuery = async (req, res, query) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        title: {
          // title คือสิ่งที่เราพิมพ์
          contains: query,
        },
      },
      include: {
        category: true,
        images: true,
      },
    });
    res.send(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Search Error" });
  }
};

const handlePrice = async (req, res, priceRange) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        price: {
          gte: priceRange[0], //ค่าต่ำสุด greater than
          lte: priceRange[1], //ค่าสูงสุด less than
        },
      },
      include: {
        category: true,
        images: true,
      },
    });
    res.send(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Search Error" });
  }
};

const handleCategory = async (req, res, categoryId) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        categoryId: {
          in: categoryId.map((id) => Number(id)),
        },
      },
      include: {
        category: true,
        images: true,
      },
    });
    res.send(products);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Search Error" });
  }
};

exports.searchFilters = async (req, res) => {
  try {
    //serach ตามสิ่งที่พิมพ์เรียกว่า query
    const { query, category, price } = req.body;

    if (query) {
      await handleQuery(req, res, query);
    }

    if (category) {
      await handleCategory(req, res, category);
    }

    if (price) {
      await handlePrice(req, res, price);
    }
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.createImages = async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.body.images, {
      public_id: `CP-${Date.now()}`,
      resource_type: "auto",
      folder: "ecommerce2025",
    });
    res.send(result);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

exports.removeImage = async (req, res) => {
  try {
    const { public_id } = req.body;
    await cloudinary.uploader.destroy(public_id, (result) => {
      res.send("Remove Image Success");
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};
