const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();

// Validation schemas
const importSchema = z.object({
  productId: z.string().min(1, 'Sản phẩm không được để trống'),
  quantity: z.number().int().min(1, 'Số lượng phải lớn hơn 0'),
  note: z.string().optional().nullable(),
});

const adjustSchema = z.object({
  productId: z.string().min(1, 'Sản phẩm không được để trống'),
  newQuantity: z.number().int().min(0, 'Số lượng không được âm'),
  note: z.string().optional().nullable(),
});

const bulkImportSchema = z.object({
  items: z.array(importSchema).min(1, 'Phải có ít nhất 1 sản phẩm'),
});

// Get current stock
const getStock = async (req, res) => {
  try {
    const { search, lowStock } = req.query;

    const where = { active: true };

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { sku: { contains: search } },
      ];
    }

    let products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        sku: true,
        name: true,
        unit: true,
        stock: true,
        minStock: true,
      },
      orderBy: { name: 'asc' },
    });

    // Filter low stock if requested
    if (lowStock === 'true') {
      products = products.filter((p) => p.stock <= p.minStock);
    }

    res.json({
      success: true,
      data: products,
    });
  } catch (error) {
    console.error('Get stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Import stock (single product)
const importStock = async (req, res) => {
  try {
    const data = importSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    const beforeQty = product.stock;
    const afterQty = beforeQty + data.quantity;

    // Update stock and create log in transaction
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: data.productId },
        data: { stock: afterQty },
      });

      await tx.stockLog.create({
        data: {
          productId: data.productId,
          type: 'IMPORT',
          quantity: data.quantity,
          beforeQty,
          afterQty,
          userId: req.user.id,
          note: data.note,
        },
      });
    });

    res.json({
      success: true,
      message: `Nhập kho thành công: ${product.name} +${data.quantity} ${product.unit || ''}`,
      data: {
        productId: product.id,
        productName: product.name,
        beforeQty,
        afterQty,
        quantity: data.quantity,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Import stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Bulk import stock
const bulkImport = async (req, res) => {
  try {
    const { items } = bulkImportSchema.parse(req.body);

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate all products exist
    for (const item of items) {
      if (!productMap.has(item.productId)) {
        return res.status(400).json({
          success: false,
          message: `Không tìm thấy sản phẩm với ID: ${item.productId}`,
        });
      }
    }

    // Process all imports in transaction
    const results = await prisma.$transaction(async (tx) => {
      const importResults = [];

      for (const item of items) {
        const product = productMap.get(item.productId);
        const beforeQty = product.stock;
        const afterQty = beforeQty + item.quantity;

        await tx.product.update({
          where: { id: item.productId },
          data: { stock: afterQty },
        });

        await tx.stockLog.create({
          data: {
            productId: item.productId,
            type: 'IMPORT',
            quantity: item.quantity,
            beforeQty,
            afterQty,
            userId: req.user.id,
            note: item.note,
          },
        });

        importResults.push({
          productId: product.id,
          productName: product.name,
          beforeQty,
          afterQty,
          quantity: item.quantity,
        });
      }

      return importResults;
    });

    res.json({
      success: true,
      message: `Nhập kho thành công ${results.length} sản phẩm`,
      data: results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Bulk import stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Adjust stock
const adjustStock = async (req, res) => {
  try {
    const data = adjustSchema.parse(req.body);

    const product = await prisma.product.findUnique({
      where: { id: data.productId },
    });

    if (!product) {
      return res.status(400).json({
        success: false,
        message: 'Không tìm thấy sản phẩm',
      });
    }

    const beforeQty = product.stock;
    const afterQty = data.newQuantity;
    const quantity = afterQty - beforeQty;

    // Update stock and create log
    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: data.productId },
        data: { stock: afterQty },
      });

      await tx.stockLog.create({
        data: {
          productId: data.productId,
          type: 'ADJUST',
          quantity,
          beforeQty,
          afterQty,
          userId: req.user.id,
          note: data.note || `Điều chỉnh từ ${beforeQty} thành ${afterQty}`,
        },
      });
    });

    res.json({
      success: true,
      message: `Điều chỉnh tồn kho thành công: ${product.name} ${beforeQty} → ${afterQty}`,
      data: {
        productId: product.id,
        productName: product.name,
        beforeQty,
        afterQty,
        quantity,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Dữ liệu không hợp lệ',
        errors: error.errors,
      });
    }
    console.error('Adjust stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get stock logs
const getLogs = async (req, res) => {
  try {
    const { productId, type, startDate, endDate, page = 1, limit = 50 } = req.query;

    const where = {};

    if (productId) {
      where.productId = productId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate + 'T23:59:59');
      }
    }

    const [logs, total] = await Promise.all([
      prisma.stockLog.findMany({
        where,
        include: {
          product: {
            select: { id: true, sku: true, name: true, unit: true },
          },
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.stockLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get stock logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get low stock alerts
const getAlerts = async (req, res) => {
  try {
    const products = await prisma.$queryRaw`
      SELECT id, sku, name, unit, stock, minStock
      FROM products
      WHERE stock <= minStock AND active = true
      ORDER BY stock ASC
    `;

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getStock, importStock, bulkImport, adjustStock, getLogs, getAlerts };
