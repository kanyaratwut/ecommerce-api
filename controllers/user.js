const prisma = require("../config/prisma");

exports.listUsers = async (req, res) => {
  try {
    const user = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        enabled: true,
        address: true,
        updatedAt: true,
      },
    });
    res.json(user);
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.changeStatus = async (req, res) => {
  try {
    const { id, enabled } = req.body;

    const user = await prisma.user.update({
      where: {
        id: Number(id),
      },
      data: {
        enabled: enabled,
      },
    });
    res.send("Update Status");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.changeRole = async (req, res) => {
  try {
    const { id, role } = req.body;

    const user = await prisma.user.update({
      where: {
        id: Number(id),
      },
      data: {
        role: role, //ค่าที่ต้องการเปลี่ยนแปลง
      },
    });
    res.send("Update Role Status");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.userCart = async (req, res) => {
  try {
    const { cart } = req.body;

    const user = await prisma.user.findFirst({
      where: {
        id: Number(req.user.id),
      },
    });

    //check quantity
    for (const item of cart) {
      const product = await prisma.product.findUnique({
        where: {
          id: item.id,
        },
        select: {
          quantity: true,
          title: true,
        },
      });

      if (!product || item.count > product.quantity) {
        return res.status(400).json({
          ok: false,
          message: `${product?.title || "Product"} is out of stock`,
        });
      }
    }

    // Delete old cart item เพื่อเพิ่มสินค้าใหม่เข้าไป
    await prisma.productOnCart.deleteMany({
      where: {
        cart: {
          orderedById: user.id,
        },
      },
    });

    //Delete old cart
    await prisma.cart.deleteMany({
      where: {
        orderedById: user.id,
      },
    });

    //เตรียมสินค้า
    let products = cart.map((item) => ({
      productId: item.id,
      count: item.count,
      price: item.price,
    }));

    //หาผลรวม
    let cartTotal = products.reduce(
      (sum, item) => sum + item.price * item.count,
      0 //ค่าเริ่มต้น
    );

    //new cart
    const newCart = await prisma.cart.create({
      data: {
        products: {
          create: products,
        }, //ตาราง many
        cartTotal: cartTotal,
        orderedById: user.id,
      },
    });

    res.send("Add Cart Success");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getUserCart = async (req, res) => {
  try {
    const cart = await prisma.cart.findFirst({
      where: {
        orderedById: Number(req.user.id),
      },
      include: {
        products: {
          //ตาราง many
          include: {
            product: true,
          },
        },
      },
    });

    res.json({
      products: cart.products,
      cartTotal: cart.cartTotal,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.emptyCart = async (req, res) => {
  try {
    const cart = await prisma.cart.findFirst({
      where: {
        orderedById: Number(req.user.id),
      },
    });

    if (!cart) {
      res.status(400).json({ message: "No Cart" });
    }

    await prisma.productOnCart.deleteMany({
      where: {
        cartId: cart.id,
      },
    });

    const result = await prisma.cart.deleteMany({
      where: {
        orderedById: Number(req.user.id),
      },
    });

    res.json({ message: "Empty Cart Success", deletedCount: result.count });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.saveAdress = async (req, res) => {
  try {
    const { address } = req.body;
    const addressUser = await prisma.user.update({
      where: {
        id: Number(req.user.id),
      },
      data: {
        //ค่าที่ต้องการเปลี่ยนแปลง
        address: address,
      },
    });

    res.json({ ok: true, message: "Address Update Success" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.saveOrder = async (req, res) => {
  try {
    //check stripe payment
    // console.log(req.body);
    // return res.send("Save Order Success");

    const { id, amount, status, currency } = req.body.paymentIntent; //destructure

    //Get User Cart
    const userCart = await prisma.cart.findFirst({
      where: {
        orderedById: Number(req.user.id),
      },
      include: {
        products: true,
      },
    });

    //check empty
    if (!userCart || userCart.products.length === 0) {
      res.status(400).json({ ok: false, message: "Cart is Empty" });
    }

    const amountTHB = Number(amount) / 100;

    //create a new order
    const order = await prisma.order.create({
      data: {
        products: {
          //ตาราง many
          create: userCart.products.map((item) => ({
            productId: item.productId,
            count: item.count,
            price: item.price,
          })),
        },
        orderedBy: {
          connect: {
            id: Number(req.user.id),
          },
        },
        cartTotal: userCart.cartTotal,
        stripePaymentId: id,
        amount: amountTHB,
        status: status,
        currency: currency,
      },
    });

    //update product (ตัดสต็อก)
    const update = userCart.products.map((item) => ({
      //เตรียมสินค้า
      where: {
        id: item.productId,
      },
      data: {
        quantity: {
          decrement: item.count, //ลดจํานวนสินค้า
        },
        sold: {
          increment: item.count, //เพิ่มจำนวนสินค้าทีขายได้
        },
      },
    }));

    await Promise.all(
      update.map(async (updated) => prisma.product.update(updated))
    );

    //delete cart
    await prisma.cart.deleteMany({
      where: {
        orderedById: Number(req.user.id),
      },
    });

    res.json({ ok: true, order });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};

exports.getOrder = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        orderedById: Number(req.user.id),
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
    });

    if (orders.length == 0) {
      // return res.status(400).json({ ok: false, message: "No Orders" });
      return res.json({ok: false, orders: []});
    }

    res.json({ ok: true, orders });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
};
