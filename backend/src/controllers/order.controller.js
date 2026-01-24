const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { generateOrderCode } = require('../utils/helpers');

const prisma = new PrismaClient();

// Validation schemas
const orderItemSchema = z.object({
  productId: z.string().min(1, 'Sản phẩm không được để trống'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0'),
  unitPrice: z.number().min(0).optional(),
  note: z.string().optional().nullable(),
});

const createSchema = z.object({
  customerId: z.string().min(1, 'Khách hàng không được để trống'),
  orderDate: z.string().optional(),
  items: z.array(orderItemSchema).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
  discount: z.number().min(0).optional().default(0),
  paidAmount: z.number().min(0).optional().default(0),
  note: z.string().optional().nullable(),
});

const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'COMPLETED', 'CANCELLED']),
});

// Helper: Get price by price type
const getPriceByType = (product, priceType) => {
  switch (priceType) {
    case 'WHOLESALE':
      return Number(product.wholesalePrice);
    case 'MEDIUM_DEALER':
      return Number(product.mediumDealerPrice);
    case 'LARGE_DEALER':
      return Number(product.largeDealerPrice);
    case 'RETAIL':
    default:
      return Number(product.retailPrice);
  }
};

// Get all orders
const getAll = async (req, res) => {
  try {
    const { search, status, customerId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};

    // Nhân viên chỉ thấy đơn của mình
    if (req.user.role === 'SALES') {
      where.userId = req.user.id;
    }

    if (search) {
      where.OR = [
        { code: { contains: search } },
        { customerName: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.orderDate.lte = new Date(endDate + 'T23:59:59');
      }
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
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
      prisma.order.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get by ID
const getById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        customer: true,
        user: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, sku: true, name: true },
            },
          },
          orderBy: { stt: 'asc' },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    // Nhân viên chỉ xem được đơn của mình
    if (req.user.role === 'SALES' && order.userId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem đơn hàng này',
      });
    }

    res.json({
      success: true,
      data: order,
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Create order
const create = async (req, res) => {
  try {
    const data = createSchema.parse(req.body);

    // Get customer with group
    const customer = await prisma.customer.findUnique({
      where: { id: data.customerId },
      include: {
        customerGroup: true,
      },
    });

    if (!customer) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    // Determine price type based on customer group
    const priceType = customer.customerGroup?.priceType || 'RETAIL';

    // Get all products
    const productIds = data.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate and calculate items
    const orderItems = [];
    let subtotal = 0;

    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i];
      const product = productMap.get(item.productId);

      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy sản phẩm với ID: ${item.productId}`,
        });
      }

      if (!product.active) {
        return res.status(400).json({
          success: false,
          message: `Sản phẩm "${product.name}" đã ngừng kinh doanh`,
        });
      }

      // Use custom unit price if provided, otherwise use default price by type
      const unitPrice = item.unitPrice !== undefined ? item.unitPrice : getPriceByType(product, priceType);
      const total = unitPrice * item.quantity;

      orderItems.push({
        stt: i + 1,
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantity: item.quantity,
        unitPrice,
        total,
        note: item.note || null,
      });

      subtotal += total;
    }

    // Calculate totals
    const discount = data.discount || 0;
    const total = subtotal - discount;
    const paidAmount = data.paidAmount || 0;
    const debtAmount = total - paidAmount;

    // Generate order code
    const code = generateOrderCode();

    // Create order with items in transaction
    const order = await prisma.$transaction(async (tx) => {
      // Create order
      const newOrder = await tx.order.create({
        data: {
          code,
          orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: customer.address,
          userId: req.user.id,
          priceType,
          subtotal,
          discount,
          total,
          paidAmount,
          debtAmount,
          note: data.note,
          items: {
            create: orderItems,
          },
        },
        include: {
          items: true,
          customer: true,
          user: {
            select: { id: true, name: true },
          },
        },
      });

      // Update customer debt
      if (debtAmount > 0) {
        await tx.customer.update({
          where: { id: customer.id },
          data: {
            totalDebt: { increment: debtAmount },
          },
        });
      }

      // Create payment record if paid
      if (paidAmount > 0) {
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            customerId: customer.id,
            amount: paidAmount,
            method: 'CASH',
            note: 'Thanh toán khi tạo đơn',
          },
        });
      }

      return newOrder;
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'Tạo đơn hàng thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Update order status
const updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const order = await prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    // Chỉ Admin/Manager được duyệt đơn
    if (status === 'APPROVED' && req.user.role === 'SALES') {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền duyệt đơn hàng',
      });
    }

    // Không cho phép sửa đơn đã hủy
    if (order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Không thể cập nhật đơn hàng đã hủy',
      });
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
    });

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Cập nhật trạng thái thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Cancel order
const cancel = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    // Nhân viên chỉ hủy được đơn của mình và đơn PENDING
    if (req.user.role === 'SALES') {
      if (order.userId !== req.user.id) {
        return res.status(403).json({
          success: false,
          message: 'Không có quyền hủy đơn hàng này',
        });
      }
      if (order.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Chỉ có thể hủy đơn hàng ở trạng thái mới tạo',
        });
      }
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được hủy trước đó',
      });
    }

    // Cancel order and revert debt
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Revert customer debt
      if (Number(order.debtAmount) > 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: {
            totalDebt: { decrement: Number(order.debtAmount) },
          },
        });
      }
    });

    res.json({
      success: true,
      message: 'Hủy đơn hàng thành công',
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getAll, getById, create, updateStatus, cancel };
