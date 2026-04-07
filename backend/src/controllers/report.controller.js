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

// Export Excel báo cáo tính lương nhân viên
const exportEmployeeSalaryExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const ExcelJS = require('exceljs');

    // Build date filter
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + 'T23:59:59');

    const orderWhere = { status: { not: 'CANCELLED' } };
    if (Object.keys(dateFilter).length > 0) orderWhere.orderDate = dateFilter;

    // If SALES role, only show their own data
    if (req.user.role === 'SALES') {
      orderWhere.userId = req.user.id;
    }

    // Get all employees
    const employees = await prisma.user.findMany({
      where: {
        active: true,
        ...(req.user.role === 'SALES' ? { id: req.user.id } : {}),
      },
      select: { id: true, name: true, email: true, role: true, phone: true },
      orderBy: { name: 'asc' },
    });

    // Get stats for each employee
    const employeeStats = await Promise.all(
      employees.map(async (employee) => {
        const empOrderWhere = { ...orderWhere, userId: employee.id };
        const orders = await prisma.order.findMany({
          where: empOrderWhere,
          select: { total: true, paidAmount: true, debtAmount: true },
        });
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalPaid = orders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
        const totalDebt = orders.reduce((sum, o) => sum + Number(o.debtAmount), 0);
        return { ...employee, totalOrders, totalRevenue, totalPaid, totalDebt };
      })
    );

    employeeStats.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BuyNow System';
    const sheet = workbook.addWorksheet('Báo cáo lương nhân viên');

    // Column widths
    sheet.columns = [
      { width: 6 },   // A - STT
      { width: 28 },  // B - Tên NV
      { width: 14 },  // C - Vai trò
      { width: 14 },  // D - SĐT
      { width: 12 },  // E - Số đơn
      { width: 20 },  // F - Doanh thu
      { width: 20 },  // G - Đã thu
      { width: 20 },  // H - Còn nợ
      { width: 20 },  // I - Hoa hồng
      { width: 20 },  // J - Ghi chú
    ];

    const dateLabel = startDate && endDate
      ? `Từ ${startDate.split('-').reverse().join('/')} đến ${endDate.split('-').reverse().join('/')}`
      : 'Tất cả thời gian';

    // === HEADER: Company Info ===
    sheet.mergeCells('A1:J1');
    const titleRow = sheet.getRow(1);
    titleRow.getCell(1).value = 'NPP HÙNG THƯ';
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF134E52' } };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    titleRow.height = 28;

    sheet.mergeCells('A2:J2');
    const addrRow = sheet.getRow(2);
    addrRow.getCell(1).value = 'ĐT: 0865.888.128 - 09.1234.1256 | Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình';
    addrRow.getCell(1).font = { size: 10, color: { argb: 'FF666666' } };
    addrRow.getCell(1).alignment = { horizontal: 'center' };

    // Title
    sheet.mergeCells('A4:J4');
    const reportTitle = sheet.getRow(4);
    reportTitle.getCell(1).value = 'BÁO CÁO DOANH THU NHÂN VIÊN - TÍNH LƯƠNG';
    reportTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF2A9299' } };
    reportTitle.getCell(1).alignment = { horizontal: 'center' };
    reportTitle.height = 24;

    sheet.mergeCells('A5:J5');
    const dateRow = sheet.getRow(5);
    dateRow.getCell(1).value = dateLabel;
    dateRow.getCell(1).font = { italic: true, size: 11, color: { argb: 'FF888888' } };
    dateRow.getCell(1).alignment = { horizontal: 'center' };

    // === TABLE HEADER ===
    const headerLabels = ['STT', 'Nhân viên', 'Vai trò', 'SĐT', 'Số đơn', 'Doanh thu', 'Đã thu', 'Còn nợ', 'Hoa hồng (2%)', 'Ghi chú'];
    const headerRow = sheet.getRow(7);
    headerRow.height = 22;
    headerLabels.forEach((label, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9299' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // === DATA ROWS ===
    const roleLabels = { ADMIN: 'Admin', MANAGER: 'Quản lý', SALES: 'Nhân viên' };
    let dataRowStart = 8;
    const activeEmployees = employeeStats.filter(e => e.totalOrders > 0);

    activeEmployees.forEach((emp, index) => {
      const row = sheet.getRow(dataRowStart + index);
      const commission = Math.round(emp.totalRevenue * 0.02);

      row.getCell(1).value = index + 1;
      row.getCell(1).alignment = { horizontal: 'center' };

      row.getCell(2).value = emp.name;
      row.getCell(2).font = { bold: true };

      row.getCell(3).value = roleLabels[emp.role] || emp.role;
      row.getCell(3).alignment = { horizontal: 'center' };

      row.getCell(4).value = emp.phone || '';
      row.getCell(4).alignment = { horizontal: 'center' };

      row.getCell(5).value = emp.totalOrders;
      row.getCell(5).alignment = { horizontal: 'center' };

      row.getCell(6).value = emp.totalRevenue;
      row.getCell(6).numFmt = '#,##0';
      row.getCell(6).alignment = { horizontal: 'right' };

      row.getCell(7).value = emp.totalPaid;
      row.getCell(7).numFmt = '#,##0';
      row.getCell(7).alignment = { horizontal: 'right' };

      row.getCell(8).value = emp.totalDebt;
      row.getCell(8).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: 'right' };
      if (emp.totalDebt > 0) {
        row.getCell(8).font = { color: { argb: 'FFDE350B' } };
      }

      row.getCell(9).value = commission;
      row.getCell(9).numFmt = '#,##0';
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(9).font = { bold: true, color: { argb: 'FF22A06B' } };

      row.getCell(10).value = '';

      // Borders & alternating colors
      for (let c = 1; c <= 10; c++) {
        row.getCell(c).border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
        if (index % 2 === 1) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5FAFA' } };
        }
      }
    });

    // === TOTAL ROW ===
    const totalRowNum = dataRowStart + activeEmployees.length;
    const totalRow = sheet.getRow(totalRowNum);
    totalRow.height = 24;

    totalRow.getCell(1).value = '';
    totalRow.getCell(2).value = 'TỔNG CỘNG';
    totalRow.getCell(2).font = { bold: true, size: 12 };

    totalRow.getCell(5).value = activeEmployees.reduce((s, e) => s + e.totalOrders, 0);
    totalRow.getCell(5).alignment = { horizontal: 'center' };
    totalRow.getCell(5).font = { bold: true };

    totalRow.getCell(6).value = activeEmployees.reduce((s, e) => s + e.totalRevenue, 0);
    totalRow.getCell(6).numFmt = '#,##0';
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(6).font = { bold: true };

    totalRow.getCell(7).value = activeEmployees.reduce((s, e) => s + e.totalPaid, 0);
    totalRow.getCell(7).numFmt = '#,##0';
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    totalRow.getCell(7).font = { bold: true };

    totalRow.getCell(8).value = activeEmployees.reduce((s, e) => s + e.totalDebt, 0);
    totalRow.getCell(8).numFmt = '#,##0';
    totalRow.getCell(8).alignment = { horizontal: 'right' };
    totalRow.getCell(8).font = { bold: true, color: { argb: 'FFDE350B' } };

    const totalCommission = activeEmployees.reduce((s, e) => s + Math.round(e.totalRevenue * 0.02), 0);
    totalRow.getCell(9).value = totalCommission;
    totalRow.getCell(9).numFmt = '#,##0';
    totalRow.getCell(9).alignment = { horizontal: 'right' };
    totalRow.getCell(9).font = { bold: true, color: { argb: 'FF22A06B' } };

    for (let c = 1; c <= 10; c++) {
      totalRow.getCell(c).border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF9FA' } };
    }

    // === SIGNATURE SECTION ===
    const sigRowNum = totalRowNum + 3;
    const sigDateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    sheet.mergeCells(`G${sigRowNum}:J${sigRowNum}`);
    sheet.getRow(sigRowNum).getCell(7).value = `Ngày ${sigDateStr}`;
    sheet.getRow(sigRowNum).getCell(7).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum).getCell(7).font = { italic: true, size: 10 };

    sheet.mergeCells(`A${sigRowNum + 1}:D${sigRowNum + 1}`);
    sheet.getRow(sigRowNum + 1).getCell(1).value = 'Người lập bảng';
    sheet.getRow(sigRowNum + 1).getCell(1).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 1).getCell(1).font = { bold: true, size: 11 };

    sheet.mergeCells(`G${sigRowNum + 1}:J${sigRowNum + 1}`);
    sheet.getRow(sigRowNum + 1).getCell(7).value = 'Giám đốc';
    sheet.getRow(sigRowNum + 1).getCell(7).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 1).getCell(7).font = { bold: true, size: 11 };

    sheet.mergeCells(`A${sigRowNum + 2}:D${sigRowNum + 2}`);
    sheet.getRow(sigRowNum + 2).getCell(1).value = '(Ký, ghi rõ họ tên)';
    sheet.getRow(sigRowNum + 2).getCell(1).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 2).getCell(1).font = { italic: true, size: 10, color: { argb: 'FF999999' } };

    sheet.mergeCells(`G${sigRowNum + 2}:J${sigRowNum + 2}`);
    sheet.getRow(sigRowNum + 2).getCell(7).value = '(Ký, ghi rõ họ tên)';
    sheet.getRow(sigRowNum + 2).getCell(7).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 2).getCell(7).font = { italic: true, size: 10, color: { argb: 'FF999999' } };

    // ==================== SHEET 2: CHI TIẾT BÁN HÀNG ====================
    const detailSheet = workbook.addWorksheet('Chi tiết bán hàng');

    detailSheet.columns = [
      { width: 6 },   // A - STT
      { width: 12 },  // B - Ngày
      { width: 28 },  // C - Tên khách
      { width: 16 },  // D - Mã hàng
      { width: 30 },  // E - Tên hàng
      { width: 14 },  // F - Mã đơn
      { width: 12 },  // G - SL bán
      { width: 12 },  // H - Hàng trả
      { width: 16 },  // I - Đơn giá
      { width: 20 },  // J - DT sau trừ trả
    ];

    // Title
    detailSheet.mergeCells('A1:J1');
    const dTitle = detailSheet.getRow(1);
    dTitle.getCell(1).value = 'CHI TIẾT BÁN HÀNG THEO NHÂN VIÊN';
    dTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF2A9299' } };
    dTitle.getCell(1).alignment = { horizontal: 'center' };
    dTitle.height = 24;

    detailSheet.mergeCells('A2:J2');
    detailSheet.getRow(2).getCell(1).value = dateLabel;
    detailSheet.getRow(2).getCell(1).font = { italic: true, size: 11, color: { argb: 'FF888888' } };
    detailSheet.getRow(2).getCell(1).alignment = { horizontal: 'center' };

    // Table header
    const detailHeaders = ['STT', 'Ngày', 'Tên khách', 'Mã hàng', 'Tên hàng', 'Mã đơn', 'SL bán', 'Hàng trả', 'Đơn giá', 'DT sau trừ trả'];
    const dHeaderRow = detailSheet.getRow(4);
    dHeaderRow.height = 22;
    detailHeaders.forEach((label, i) => {
      const cell = dHeaderRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9299' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    });

    // Fetch detail rows for each employee
    let currentRow = 5;
    const grandTotals = { quantity: 0, returned: 0, revenue: 0 };

    for (const emp of activeEmployees) {
      // Fetch orders + items + returns for this employee
      const empOrders = await prisma.order.findMany({
        where: { ...orderWhere, userId: emp.id },
        include: {
          items: {
            include: { product: { select: { sku: true } } },
          },
          returns: prisma.orderReturn ? {
            include: { items: true },
          } : undefined,
        },
        orderBy: { orderDate: 'asc' },
      });

      if (empOrders.length === 0) continue;

      // Group header row for employee
      detailSheet.mergeCells(`A${currentRow}:J${currentRow}`);
      const groupCell = detailSheet.getRow(currentRow).getCell(1);
      groupCell.value = `▸ Nhân viên: ${emp.name} (${roleLabels[emp.role] || emp.role})`;
      groupCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      groupCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF134E52' } };
      groupCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
      detailSheet.getRow(currentRow).height = 22;
      currentRow++;

      let stt = 0;
      const empTotals = { quantity: 0, returned: 0, revenue: 0 };

      for (const order of empOrders) {
        // Build map of returned quantity per orderItemId for this order
        const returnedMap = new Map();
        if (order.returns && order.returns.length > 0) {
          for (const ret of order.returns) {
            for (const ri of ret.items) {
              const prev = returnedMap.get(ri.orderItemId) || 0;
              returnedMap.set(ri.orderItemId, prev + Number(ri.quantity));
            }
          }
        }

        for (const item of order.items) {
          stt++;
          const qty = Number(item.quantity);
          const returnedQty = returnedMap.get(item.id) || 0;
          const unitPrice = Number(item.unitPrice);
          const netRevenue = (qty - returnedQty) * unitPrice;

          empTotals.quantity += qty;
          empTotals.returned += returnedQty;
          empTotals.revenue += netRevenue;

          const row = detailSheet.getRow(currentRow);
          row.getCell(1).value = stt;
          row.getCell(1).alignment = { horizontal: 'center' };

          row.getCell(2).value = new Date(order.orderDate).toLocaleDateString('vi-VN');
          row.getCell(2).alignment = { horizontal: 'center' };

          row.getCell(3).value = order.customerName || '';

          row.getCell(4).value = item.product?.sku || '';
          row.getCell(4).alignment = { horizontal: 'center' };

          row.getCell(5).value = item.productName || '';

          row.getCell(6).value = order.code;
          row.getCell(6).alignment = { horizontal: 'center' };
          row.getCell(6).font = { color: { argb: 'FF2A9299' } };

          row.getCell(7).value = qty;
          row.getCell(7).alignment = { horizontal: 'center' };

          row.getCell(8).value = returnedQty;
          row.getCell(8).alignment = { horizontal: 'center' };
          if (returnedQty > 0) {
            row.getCell(8).font = { color: { argb: 'FFDE350B' }, bold: true };
          }

          row.getCell(9).value = unitPrice;
          row.getCell(9).numFmt = '#,##0';
          row.getCell(9).alignment = { horizontal: 'right' };

          row.getCell(10).value = netRevenue;
          row.getCell(10).numFmt = '#,##0';
          row.getCell(10).alignment = { horizontal: 'right' };
          row.getCell(10).font = { bold: true, color: { argb: 'FF134E52' } };

          for (let c = 1; c <= 10; c++) {
            row.getCell(c).border = {
              top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
              right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            };
            if (stt % 2 === 0) {
              row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
            }
          }
          currentRow++;
        }
      }

      // Subtotal row for employee
      const subRow = detailSheet.getRow(currentRow);
      detailSheet.mergeCells(`A${currentRow}:F${currentRow}`);
      subRow.getCell(1).value = `Cộng nhân viên ${emp.name}`;
      subRow.getCell(1).font = { bold: true, italic: true };
      subRow.getCell(1).alignment = { horizontal: 'right', indent: 1 };

      subRow.getCell(7).value = empTotals.quantity;
      subRow.getCell(7).alignment = { horizontal: 'center' };
      subRow.getCell(7).font = { bold: true };

      subRow.getCell(8).value = empTotals.returned;
      subRow.getCell(8).alignment = { horizontal: 'center' };
      subRow.getCell(8).font = { bold: true, color: { argb: 'FFDE350B' } };

      subRow.getCell(10).value = empTotals.revenue;
      subRow.getCell(10).numFmt = '#,##0';
      subRow.getCell(10).alignment = { horizontal: 'right' };
      subRow.getCell(10).font = { bold: true, color: { argb: 'FF22A06B' } };

      for (let c = 1; c <= 10; c++) {
        subRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF9FA' } };
        subRow.getCell(c).border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      }
      currentRow++;

      grandTotals.quantity += empTotals.quantity;
      grandTotals.returned += empTotals.returned;
      grandTotals.revenue += empTotals.revenue;

      // Empty spacer row
      currentRow++;
    }

    // Grand total row
    if (grandTotals.quantity > 0) {
      const gRow = detailSheet.getRow(currentRow);
      gRow.height = 24;
      detailSheet.mergeCells(`A${currentRow}:F${currentRow}`);
      gRow.getCell(1).value = 'TỔNG CỘNG TẤT CẢ NHÂN VIÊN';
      gRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } };
      gRow.getCell(1).alignment = { horizontal: 'right', indent: 1 };

      gRow.getCell(7).value = grandTotals.quantity;
      gRow.getCell(7).alignment = { horizontal: 'center' };
      gRow.getCell(7).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      gRow.getCell(8).value = grandTotals.returned;
      gRow.getCell(8).alignment = { horizontal: 'center' };
      gRow.getCell(8).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      gRow.getCell(10).value = grandTotals.revenue;
      gRow.getCell(10).numFmt = '#,##0';
      gRow.getCell(10).alignment = { horizontal: 'right' };
      gRow.getCell(10).font = { bold: true, color: { argb: 'FFFFFFFF' } };

      for (let c = 1; c <= 10; c++) {
        gRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9299' } };
        gRow.getCell(c).border = {
          top: { style: 'medium' }, bottom: { style: 'medium' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      }
    }

    // Freeze header rows in detail sheet
    detailSheet.views = [{ state: 'frozen', ySplit: 4 }];

    // Write to response
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const fileName = `Bao_cao_luong_${startDate || 'all'}_${endDate || 'all'}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export employee salary excel error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xuất Excel' });
  }
};

module.exports = { getRevenueByEmployee, getEmployeeOrders, exportEmployeeSalaryExcel };
