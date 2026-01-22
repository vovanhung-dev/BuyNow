const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const createSchema = z.object({
  orderId: z.string().min(1, 'Đơn hàng không được để trống'),
  amount: z.number().min(1, 'Số tiền phải lớn hơn 0'),
  method: z.enum(['CASH', 'BANK_TRANSFER']).optional().default('CASH'),
  paymentDate: z.string().optional(),
  note: z.string().optional().nullable(),
});

// Get all payments
const getAll = async (req, res) => {
  try {
    const { customerId, orderId, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (orderId) {
      where.orderId = orderId;
    }

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = new Date(startDate);
      }
      if (endDate) {
        where.paymentDate.lte = new Date(endDate + 'T23:59:59');
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          order: {
            select: { id: true, code: true, total: true },
          },
          customer: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { paymentDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      success: true,
      data: payments,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get payments error:', error);
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

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
        customer: true,
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy thanh toán',
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Create payment
const create = async (req, res) => {
  try {
    const data = createSchema.parse(req.body);

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: data.orderId },
    });

    if (!order) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy đơn hàng',
      });
    }

    if (order.status === 'CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Không thể thanh toán cho đơn hàng đã hủy',
      });
    }

    const currentDebt = Number(order.debtAmount);

    if (currentDebt <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Đơn hàng đã được thanh toán đủ',
      });
    }

    if (data.amount > currentDebt) {
      return res.status(400).json({
        success: false,
        message: `Số tiền thanh toán không được lớn hơn công nợ (${currentDebt.toLocaleString('vi-VN')} đ)`,
      });
    }

    // Create payment and update order/customer in transaction
    const payment = await prisma.$transaction(async (tx) => {
      // Create payment
      const newPayment = await tx.payment.create({
        data: {
          orderId: order.id,
          customerId: order.customerId,
          amount: data.amount,
          method: data.method,
          paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
          note: data.note,
        },
        include: {
          order: {
            select: { id: true, code: true },
          },
          customer: {
            select: { id: true, name: true },
          },
        },
      });

      // Update order
      await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: { increment: data.amount },
          debtAmount: { decrement: data.amount },
        },
      });

      // Update customer debt
      await tx.customer.update({
        where: { id: order.customerId },
        data: {
          totalDebt: { decrement: data.amount },
        },
      });

      return newPayment;
    });

    res.status(201).json({
      success: true,
      data: payment,
      message: 'Ghi nhận thanh toán thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getAll, getById, create };
