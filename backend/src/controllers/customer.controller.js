const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');
const { generateCustomerCode } = require('../utils/helpers');

const prisma = new PrismaClient();

// Validation schemas
const createSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(1, 'Tên khách hàng không được để trống'),
  customerGroupId: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  ward: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

// Get all customers
const getAll = async (req, res) => {
  try {
    const { search, customerGroupId, page = 1, limit = 50 } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { code: { contains: search } },
        { address: { contains: search } },
      ];
    }

    if (customerGroupId) {
      where.customerGroupId = customerGroupId;
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          customerGroup: {
            select: { id: true, code: true, name: true, priceType: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get customers error:', error);
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

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        customerGroup: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    res.json({
      success: true,
      data: customer,
    });
  } catch (error) {
    console.error('Get customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Create
const create = async (req, res) => {
  try {
    const data = createSchema.parse(req.body);

    // Generate code if not provided
    if (!data.code) {
      data.code = generateCustomerCode();
    }

    // Check if code exists
    const existing = await prisma.customer.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Mã khách hàng đã tồn tại',
      });
    }

    const customer = await prisma.customer.create({
      data,
      include: {
        customerGroup: true,
      },
    });

    res.status(201).json({
      success: true,
      data: customer,
      message: 'Tạo khách hàng thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Create customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Update
const update = async (req, res) => {
  try {
    const { id } = req.params;
    const data = updateSchema.parse(req.body);

    const existing = await prisma.customer.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    // Check code unique if changed
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.customer.findUnique({
        where: { code: data.code },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Mã khách hàng đã tồn tại',
        });
      }
    }

    const customer = await prisma.customer.update({
      where: { id },
      data,
      include: {
        customerGroup: true,
      },
    });

    res.json({
      success: true,
      data: customer,
      message: 'Cập nhật khách hàng thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Update customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Delete
const remove = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orders: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    if (existing._count.orders > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa khách hàng đã có ${existing._count.orders} đơn hàng`,
      });
    }

    await prisma.customer.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa khách hàng thành công',
    });
  } catch (error) {
    console.error('Delete customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get customer orders
const getOrders = async (req, res) => {
  try {
    const { id } = req.params;

    const orders = await prisma.order.findMany({
      where: { customerId: id },
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: orders,
    });
  } catch (error) {
    console.error('Get customer orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get customer debt
const getDebt = async (req, res) => {
  try {
    const { id } = req.params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        totalDebt: true,
      },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    // Get unpaid orders
    const unpaidOrders = await prisma.order.findMany({
      where: {
        customerId: id,
        debtAmount: { gt: 0 },
      },
      select: {
        id: true,
        code: true,
        orderDate: true,
        total: true,
        paidAmount: true,
        debtAmount: true,
      },
      orderBy: { orderDate: 'desc' },
    });

    res.json({
      success: true,
      data: {
        customer,
        unpaidOrders,
      },
    });
  } catch (error) {
    console.error('Get customer debt error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getAll, getById, create, update, remove, getOrders, getDebt };
