const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const createSchema = z.object({
  code: z.string().min(1, 'Mã nhóm không được để trống'),
  name: z.string().min(1, 'Tên nhóm không được để trống'),
  priceType: z.enum(['WHOLESALE', 'MEDIUM_DEALER', 'LARGE_DEALER', 'RETAIL']),
});

const updateSchema = z.object({
  code: z.string().min(1, 'Mã nhóm không được để trống').optional(),
  name: z.string().min(1, 'Tên nhóm không được để trống').optional(),
  priceType: z.enum(['WHOLESALE', 'MEDIUM_DEALER', 'LARGE_DEALER', 'RETAIL']).optional(),
});

// Get all customer groups
const getAll = async (req, res) => {
  try {
    const groups = await prisma.customerGroup.findMany({
      include: {
        _count: {
          select: { customers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: groups,
    });
  } catch (error) {
    console.error('Get customer groups error:', error);
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

    const group = await prisma.customerGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm khách hàng',
      });
    }

    res.json({
      success: true,
      data: group,
    });
  } catch (error) {
    console.error('Get customer group error:', error);
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

    // Check if code exists
    const existing = await prisma.customerGroup.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Mã nhóm đã tồn tại',
      });
    }

    const group = await prisma.customerGroup.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: group,
      message: 'Tạo nhóm khách hàng thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Create customer group error:', error);
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

    const existing = await prisma.customerGroup.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm khách hàng',
      });
    }

    // Check code unique if changed
    if (data.code && data.code !== existing.code) {
      const codeExists = await prisma.customerGroup.findUnique({
        where: { code: data.code },
      });

      if (codeExists) {
        return res.status(400).json({
          success: false,
          message: 'Mã nhóm đã tồn tại',
        });
      }
    }

    const group = await prisma.customerGroup.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: group,
      message: 'Cập nhật nhóm khách hàng thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Update customer group error:', error);
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

    const existing = await prisma.customerGroup.findUnique({
      where: { id },
      include: {
        _count: {
          select: { customers: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhóm khách hàng',
      });
    }

    if (existing._count.customers > 0) {
      return res.status(400).json({
        success: false,
        message: `Không thể xóa nhóm đang có ${existing._count.customers} khách hàng`,
      });
    }

    await prisma.customerGroup.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa nhóm khách hàng thành công',
    });
  } catch (error) {
    console.error('Delete customer group error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getAll, getById, create, update, remove };
