const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Generate return code
const generateReturnCode = () => {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `TH${year}${month}${day}${random}`;
};

// Validation schema
const returnItemSchema = z.object({
  orderItemId: z.string().min(1),
  productId: z.string().min(1),
  productName: z.string().min(1),
  unit: z.string().optional().nullable(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
});

const createSchema = z.object({
  orderId: z.string().min(1, 'Đơn hàng không được để trống'),
  items: z.array(returnItemSchema).min(1, 'Phải có ít nhất 1 sản phẩm trả'),
  refundAmount: z.number().min(0).optional().default(0),
  reason: z.string().optional().nullable(),
});

// Get all returns
const getAll = async (req, res) => {
  try {
    // Check if orderReturn model exists
    if (!prisma.orderReturn) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }

    const { orderId, customerId, startDate, endDate, page = 1, limit = 20 } = req.query;

    const where = {};

    if (orderId) where.orderId = orderId;
    if (customerId) where.customerId = customerId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate + 'T23:59:59');
    }

    const [returns, total] = await Promise.all([
      prisma.orderReturn.findMany({
        where,
        include: {
          order: {
            select: { id: true, code: true },
          },
          customer: {
            select: { id: true, code: true, name: true },
          },
          user: {
            select: { id: true, name: true },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.orderReturn.count({ where }),
    ]);

    res.json({
      success: true,
      data: returns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return res.json({
        success: true,
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      });
    }
    console.error('Get returns error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get by ID
const getById = async (req, res) => {
  try {
    if (!prisma.orderReturn) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu trả hàng',
      });
    }

    const { id } = req.params;

    const orderReturn = await prisma.orderReturn.findUnique({
      where: { id },
      include: {
        order: {
          select: { id: true, code: true, orderDate: true },
        },
        customer: {
          select: { id: true, code: true, name: true, phone: true },
        },
        user: {
          select: { id: true, name: true },
        },
        items: true,
      },
    });

    if (!orderReturn) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy phiếu trả hàng',
      });
    }

    res.json({
      success: true,
      data: orderReturn,
    });
  } catch (error) {
    console.error('Get return error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Create return
const create = async (req, res) => {
  try {
    if (!prisma.orderReturn) {
      return res.status(500).json({
        success: false,
        message: 'Chức năng trả hàng chưa được kích hoạt. Vui lòng chạy migration.',
      });
    }

    const data = createSchema.parse(req.body);

    // Get order with items
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    if (order.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Chỉ có thể trả hàng đơn đã hoàn thành',
      });
    }

    // Validate return items against order items
    const orderItemMap = new Map(order.items.map(item => [item.id, item]));

    for (const item of data.items) {
      const orderItem = orderItemMap.get(item.orderItemId);
      if (!orderItem) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy sản phẩm trong đơn hàng`,
        });
      }
      if (item.quantity > orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Số lượng trả của "${item.productName}" vượt quá số lượng đã mua`,
        });
      }
    }

    // Calculate total return amount
    const returnItems = data.items.map(item => ({
      orderItemId: item.orderItemId,
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.unitPrice * item.quantity,
    }));

    const totalAmount = returnItems.reduce((sum, item) => sum + item.total, 0);
    const refundAmount = data.refundAmount || 0;

    // Generate code
    const code = generateReturnCode();

    // Create return in transaction
    const orderReturn = await prisma.$transaction(async (tx) => {
      // Create return record
      const newReturn = await tx.orderReturn.create({
        data: {
          code,
          orderId: order.id,
          customerId: order.customerId,
          userId: req.user.id,
          totalAmount,
          refundAmount,
          reason: data.reason,
          items: {
            create: returnItems,
          },
        },
        include: {
          items: true,
          order: { select: { id: true, code: true } },
          customer: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      });

      // Update stock for each returned product
      for (const item of returnItems) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (product) {
          const beforeQty = product.stock;
          const afterQty = beforeQty + item.quantity;

          // Update product stock
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: afterQty },
          });

          // Create stock log
          await tx.stockLog.create({
            data: {
              productId: item.productId,
              type: 'RETURN',
              quantity: item.quantity,
              beforeQty,
              afterQty,
              orderId: order.code,
              userId: req.user.id,
              note: `Trả hàng từ đơn ${order.code}`,
            },
          });
        }
      }

      // Update customer debt (reduce debt by refund amount)
      if (refundAmount > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalDebt: { decrement: refundAmount },
          },
        });

        // Also update order's debt
        await tx.order.update({
          where: { id: order.id },
          data: {
            debtAmount: { decrement: refundAmount },
          },
        });
      }

      return newReturn;
    });

    res.status(201).json({
      success: true,
      data: orderReturn,
      message: 'Tạo phiếu trả hàng thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Create return error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get returns by order
const getByOrder = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Check if orderReturn model exists (migration may not have run yet)
    if (!prisma.orderReturn) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const returns = await prisma.orderReturn.findMany({
      where: { orderId },
      include: {
        items: true,
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: returns,
    });
  } catch (error) {
    // If table doesn't exist yet, return empty array
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return res.json({
        success: true,
        data: [],
      });
    }
    console.error('Get returns by order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getAll, getById, create, getByOrder };
