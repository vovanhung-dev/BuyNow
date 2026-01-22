const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const createSchema = z.object({
  sku: z.string().min(1, 'Mã SKU không được để trống'),
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  unit: z.string().optional().nullable(),
  wholesalePrice: z.number().min(0).optional().default(0),
  mediumDealerPrice: z.number().min(0).optional().default(0),
  largeDealerPrice: z.number().min(0).optional().default(0),
  retailPrice: z.number().min(0).optional().default(0),
  stock: z.number().int().min(0).optional().default(0),
  minStock: z.number().int().min(0).optional().default(10),
  active: z.boolean().optional().default(true),
});

const updateSchema = createSchema.partial();

// Get all products
const getAll = async (req, res) => {
  try {
    const { search, active, lowStock, page = 1, limit = 50 } = req.query;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    if (lowStock === 'true') {
      where.stock = { lte: prisma.product.fields.minStock };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      success: true,
      data: products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get products error:', error);
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

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    console.error('Get product error:', error);
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

    // Check if SKU exists
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Mã SKU đã tồn tại',
      });
    }

    const product = await prisma.product.create({
      data,
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Tạo sản phẩm thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Create product error:', error);
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

    const existing = await prisma.product.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    // Check SKU unique if changed
    if (data.sku && data.sku !== existing.sku) {
      const skuExists = await prisma.product.findUnique({
        where: { sku: data.sku },
      });

      if (skuExists) {
        return res.status(400).json({
          success: false,
          message: 'Mã SKU đã tồn tại',
        });
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data,
    });

    res.json({
      success: true,
      data: product,
      message: 'Cập nhật sản phẩm thành công',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Update product error:', error);
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

    const existing = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    if (existing._count.orderItems > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm đã có trong đơn hàng',
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Xóa sản phẩm thành công',
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get price by price type
const getPrice = async (req, res) => {
  try {
    const { id, priceType } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    let price = product.retailPrice;

    switch (priceType) {
      case 'WHOLESALE':
        price = product.wholesalePrice;
        break;
      case 'MEDIUM_DEALER':
        price = product.mediumDealerPrice;
        break;
      case 'LARGE_DEALER':
        price = product.largeDealerPrice;
        break;
      case 'RETAIL':
      default:
        price = product.retailPrice;
    }

    res.json({
      success: true,
      data: {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        priceType,
        price,
      },
    });
  } catch (error) {
    console.error('Get price error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get low stock products
const getLowStock = async (req, res) => {
  try {
    const products = await prisma.$queryRaw`
      SELECT * FROM products
      WHERE stock <= minStock AND active = true
      ORDER BY stock ASC
    `;

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getAll, getById, create, update, remove, getPrice, getLowStock };
