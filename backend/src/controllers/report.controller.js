const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get revenue report by employee
const getRevenueByEmployee = async (req, res) => {
  try {
    const { startDate, endDate, userId } = req.query;

    // Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate + 'T23:59:59');
    }

    const orderWhere = {
      status: { not: 'CANCELLED' },
    };

    if (Object.keys(dateFilter).length > 0) {
      orderWhere.orderDate = dateFilter;
    }

    // If SALES role, only show their own data
    if (req.user.role === 'SALES') {
      orderWhere.userId = req.user.id;
    } else if (userId) {
      // Admin/Manager can filter by specific employee
      orderWhere.userId = userId;
    }

    // Get all employees with their order stats
    const employees = await prisma.user.findMany({
      where: {
        active: true,
        // If SALES, only get their own record
        ...(req.user.role === 'SALES' ? { id: req.user.id } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: 'asc' },
    });

    // Get order statistics for each employee
    const employeeStats = await Promise.all(
      employees.map(async (employee) => {
        const employeeOrderWhere = {
          ...orderWhere,
          userId: employee.id,
        };

        const orders = await prisma.order.findMany({
          where: employeeOrderWhere,
          select: {
            total: true,
            paidAmount: true,
            debtAmount: true,
          },
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalPaid = orders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
        const totalDebt = orders.reduce((sum, o) => sum + Number(o.debtAmount), 0);
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        return {
          ...employee,
          totalOrders,
          totalRevenue,
          totalPaid,
          totalDebt,
          avgOrderValue,
        };
      })
    );

    // Sort by revenue descending
    employeeStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate totals
    const summary = {
      totalEmployees: employeeStats.filter(e => e.totalOrders > 0).length,
      totalOrders: employeeStats.reduce((sum, e) => sum + e.totalOrders, 0),
      totalRevenue: employeeStats.reduce((sum, e) => sum + e.totalRevenue, 0),
      totalPaid: employeeStats.reduce((sum, e) => sum + e.totalPaid, 0),
      totalDebt: employeeStats.reduce((sum, e) => sum + e.totalDebt, 0),
    };

    res.json({
      success: true,
      data: employeeStats,
      summary,
    });
  } catch (error) {
    console.error('Get revenue by employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

// Get employee detail with orders
const getEmployeeOrders = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, page = 1, limit = 20 } = req.query;

    // Check permission
    if (req.user.role === 'SALES' && req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: 'Không có quyền xem báo cáo của nhân viên khác',
      });
    }

    // Get employee info
    const employee = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy nhân viên',
      });
    }

    // Build order query
    const orderWhere = {
      userId: id,
      status: { not: 'CANCELLED' },
    };

    if (startDate || endDate) {
      orderWhere.orderDate = {};
      if (startDate) orderWhere.orderDate.gte = new Date(startDate);
      if (endDate) orderWhere.orderDate.lte = new Date(endDate + 'T23:59:59');
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: {
          customer: {
            select: { id: true, code: true, name: true },
          },
        },
        orderBy: { orderDate: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.order.count({ where: orderWhere }),
    ]);

    // Calculate summary for this employee
    const allOrders = await prisma.order.findMany({
      where: orderWhere,
      select: { total: true, paidAmount: true, debtAmount: true },
    });

    const summary = {
      totalOrders: allOrders.length,
      totalRevenue: allOrders.reduce((sum, o) => sum + Number(o.total), 0),
      totalPaid: allOrders.reduce((sum, o) => sum + Number(o.paidAmount), 0),
      totalDebt: allOrders.reduce((sum, o) => sum + Number(o.debtAmount), 0),
    };

    res.json({
      success: true,
      employee,
      summary,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get employee orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi server',
    });
  }
};

module.exports = { getRevenueByEmployee, getEmployeeOrders };
