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
            discount: true,
            subtotal: true,
          },
        });

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalPaid = orders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
        const totalDebt = orders.reduce((sum, o) => sum + Number(o.debtAmount), 0);
        const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discount), 0);
        const totalSubtotal = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
        const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

        return {
          ...employee,
          totalOrders,
          totalRevenue,
          totalPaid,
          totalDebt,
          totalDiscount,
          totalSubtotal,
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
      totalDiscount: employeeStats.reduce((sum, e) => sum + e.totalDiscount, 0),
      totalSubtotal: employeeStats.reduce((sum, e) => sum + e.totalSubtotal, 0),
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
          select: { total: true, paidAmount: true, debtAmount: true, discount: true, subtotal: true },
        });
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const totalPaid = orders.reduce((sum, o) => sum + Number(o.paidAmount), 0);
        const totalDebt = orders.reduce((sum, o) => sum + Number(o.debtAmount), 0);
        const totalDiscount = orders.reduce((sum, o) => sum + Number(o.discount), 0);
        const totalSubtotal = orders.reduce((sum, o) => sum + Number(o.subtotal), 0);
        return { ...employee, totalOrders, totalRevenue, totalPaid, totalDebt, totalDiscount, totalSubtotal };
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
      { width: 26 },  // B - Tên NV
      { width: 12 },  // C - Vai trò
      { width: 13 },  // D - SĐT
      { width: 10 },  // E - Số đơn
      { width: 18 },  // F - Doanh thu hàng
      { width: 16 },  // G - Chiết khấu
      { width: 18 },  // H - Doanh thu thực
      { width: 16 },  // I - Đã thu
      { width: 16 },  // J - Còn nợ
      { width: 16 },  // K - Hoa hồng
    ];

    const dateLabel = startDate && endDate
      ? `Từ ${startDate.split('-').reverse().join('/')} đến ${endDate.split('-').reverse().join('/')}`
      : 'Tất cả thời gian';

    // === HEADER: Company Info ===
    sheet.mergeCells('A1:K1');
    const titleRow = sheet.getRow(1);
    titleRow.getCell(1).value = 'NPP HÙNG THƯ';
    titleRow.getCell(1).font = { bold: true, size: 16, color: { argb: 'FF134E52' } };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    titleRow.height = 28;

    sheet.mergeCells('A2:K2');
    const addrRow = sheet.getRow(2);
    addrRow.getCell(1).value = 'ĐT: 0865.888.128 - 09.1234.1256 | Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình';
    addrRow.getCell(1).font = { size: 10, color: { argb: 'FF666666' } };
    addrRow.getCell(1).alignment = { horizontal: 'center' };

    // Title
    sheet.mergeCells('A4:K4');
    const reportTitle = sheet.getRow(4);
    reportTitle.getCell(1).value = 'BÁO CÁO DOANH THU NHÂN VIÊN - TÍNH LƯƠNG';
    reportTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF2A9299' } };
    reportTitle.getCell(1).alignment = { horizontal: 'center' };
    reportTitle.height = 24;

    sheet.mergeCells('A5:K5');
    const dateRow = sheet.getRow(5);
    dateRow.getCell(1).value = dateLabel;
    dateRow.getCell(1).font = { italic: true, size: 11, color: { argb: 'FF888888' } };
    dateRow.getCell(1).alignment = { horizontal: 'center' };

    // === TABLE HEADER ===
    const headerLabels = ['STT', 'Nhân viên', 'Vai trò', 'SĐT', 'Số đơn', 'Doanh thu hàng', 'Chiết khấu', 'Doanh thu thực', 'Đã thu', 'Còn nợ', 'Hoa hồng (2%)'];
    const headerRow = sheet.getRow(7);
    headerRow.height = 30;
    headerLabels.forEach((label, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = label;
      cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9299' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
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

      // Doanh thu hàng (trước chiết khấu) = subtotal
      row.getCell(6).value = emp.totalSubtotal;
      row.getCell(6).numFmt = '#,##0';
      row.getCell(6).alignment = { horizontal: 'right' };

      // Chiết khấu
      row.getCell(7).value = emp.totalDiscount;
      row.getCell(7).numFmt = '#,##0';
      row.getCell(7).alignment = { horizontal: 'right' };
      if (emp.totalDiscount > 0) {
        row.getCell(7).font = { color: { argb: 'FFE5A100' } };
      }

      // Doanh thu thực (sau chiết khấu) = total
      row.getCell(8).value = emp.totalRevenue;
      row.getCell(8).numFmt = '#,##0';
      row.getCell(8).alignment = { horizontal: 'right' };
      row.getCell(8).font = { bold: true, color: { argb: 'FF134E52' } };

      row.getCell(9).value = emp.totalPaid;
      row.getCell(9).numFmt = '#,##0';
      row.getCell(9).alignment = { horizontal: 'right' };

      row.getCell(10).value = emp.totalDebt;
      row.getCell(10).numFmt = '#,##0';
      row.getCell(10).alignment = { horizontal: 'right' };
      if (emp.totalDebt > 0) {
        row.getCell(10).font = { color: { argb: 'FFDE350B' } };
      }

      row.getCell(11).value = commission;
      row.getCell(11).numFmt = '#,##0';
      row.getCell(11).alignment = { horizontal: 'right' };
      row.getCell(11).font = { bold: true, color: { argb: 'FF22A06B' } };

      // Borders & alternating colors
      for (let c = 1; c <= 11; c++) {
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

    totalRow.getCell(6).value = activeEmployees.reduce((s, e) => s + e.totalSubtotal, 0);
    totalRow.getCell(6).numFmt = '#,##0';
    totalRow.getCell(6).alignment = { horizontal: 'right' };
    totalRow.getCell(6).font = { bold: true };

    totalRow.getCell(7).value = activeEmployees.reduce((s, e) => s + e.totalDiscount, 0);
    totalRow.getCell(7).numFmt = '#,##0';
    totalRow.getCell(7).alignment = { horizontal: 'right' };
    totalRow.getCell(7).font = { bold: true, color: { argb: 'FFE5A100' } };

    totalRow.getCell(8).value = activeEmployees.reduce((s, e) => s + e.totalRevenue, 0);
    totalRow.getCell(8).numFmt = '#,##0';
    totalRow.getCell(8).alignment = { horizontal: 'right' };
    totalRow.getCell(8).font = { bold: true, color: { argb: 'FF134E52' } };

    totalRow.getCell(9).value = activeEmployees.reduce((s, e) => s + e.totalPaid, 0);
    totalRow.getCell(9).numFmt = '#,##0';
    totalRow.getCell(9).alignment = { horizontal: 'right' };
    totalRow.getCell(9).font = { bold: true };

    totalRow.getCell(10).value = activeEmployees.reduce((s, e) => s + e.totalDebt, 0);
    totalRow.getCell(10).numFmt = '#,##0';
    totalRow.getCell(10).alignment = { horizontal: 'right' };
    totalRow.getCell(10).font = { bold: true, color: { argb: 'FFDE350B' } };

    const totalCommission = activeEmployees.reduce((s, e) => s + Math.round(e.totalRevenue * 0.02), 0);
    totalRow.getCell(11).value = totalCommission;
    totalRow.getCell(11).numFmt = '#,##0';
    totalRow.getCell(11).alignment = { horizontal: 'right' };
    totalRow.getCell(11).font = { bold: true, color: { argb: 'FF22A06B' } };

    for (let c = 1; c <= 11; c++) {
      totalRow.getCell(c).border = {
        top: { style: 'medium' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF9FA' } };
    }

    // === SIGNATURE SECTION ===
    const sigRowNum = totalRowNum + 3;
    const sigDateStr = new Date().toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });

    sheet.mergeCells(`H${sigRowNum}:K${sigRowNum}`);
    sheet.getRow(sigRowNum).getCell(8).value = `Ngày ${sigDateStr}`;
    sheet.getRow(sigRowNum).getCell(8).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum).getCell(8).font = { italic: true, size: 10 };

    sheet.mergeCells(`A${sigRowNum + 1}:D${sigRowNum + 1}`);
    sheet.getRow(sigRowNum + 1).getCell(1).value = 'Người lập bảng';
    sheet.getRow(sigRowNum + 1).getCell(1).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 1).getCell(1).font = { bold: true, size: 11 };

    sheet.mergeCells(`H${sigRowNum + 1}:K${sigRowNum + 1}`);
    sheet.getRow(sigRowNum + 1).getCell(8).value = 'Giám đốc';
    sheet.getRow(sigRowNum + 1).getCell(8).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 1).getCell(8).font = { bold: true, size: 11 };

    sheet.mergeCells(`A${sigRowNum + 2}:D${sigRowNum + 2}`);
    sheet.getRow(sigRowNum + 2).getCell(1).value = '(Ký, ghi rõ họ tên)';
    sheet.getRow(sigRowNum + 2).getCell(1).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 2).getCell(1).font = { italic: true, size: 10, color: { argb: 'FF999999' } };

    sheet.mergeCells(`H${sigRowNum + 2}:K${sigRowNum + 2}`);
    sheet.getRow(sigRowNum + 2).getCell(8).value = '(Ký, ghi rõ họ tên)';
    sheet.getRow(sigRowNum + 2).getCell(8).alignment = { horizontal: 'center' };
    sheet.getRow(sigRowNum + 2).getCell(8).font = { italic: true, size: 10, color: { argb: 'FF999999' } };

    // ==================== CÁC SHEET CHI TIẾT: MỖI NHÂN VIÊN 1 SHEET ====================
    const usedSheetNames = new Set(['báo cáo lương nhân viên']);
    const makeSheetName = (name) => {
      let base = (name || 'Nhân viên').replace(/[:\\/?*\[\]]/g, ' ').trim().slice(0, 28);
      if (!base) base = 'Nhân viên';
      let candidate = base;
      let i = 2;
      while (usedSheetNames.has(candidate.toLowerCase())) {
        candidate = `${base.slice(0, 26)} ${i}`;
        i++;
      }
      usedSheetNames.add(candidate.toLowerCase());
      return candidate;
    };

    const detailHeaders = ['STT', 'Ngày', 'Tên khách', 'Mã hàng', 'Tên hàng', 'Mã đơn', 'SL bán', 'Hàng trả', 'Đơn giá', 'DT sau trừ trả'];

    for (const emp of activeEmployees) {
      const empOrders = await prisma.order.findMany({
        where: { ...orderWhere, userId: emp.id },
        include: {
          items: { include: { product: { select: { sku: true } } } },
          returns: prisma.orderReturn ? { include: { items: true } } : undefined,
        },
        orderBy: { orderDate: 'asc' },
      });

      if (empOrders.length === 0) continue;

      const empSheet = workbook.addWorksheet(makeSheetName(emp.name));

      empSheet.columns = [
        { width: 6 }, { width: 12 }, { width: 28 }, { width: 16 }, { width: 30 },
        { width: 14 }, { width: 12 }, { width: 12 }, { width: 16 }, { width: 20 },
      ];

      empSheet.mergeCells('A1:J1');
      const empTitle = empSheet.getRow(1);
      empTitle.getCell(1).value = `CHI TIẾT BÁN HÀNG - ${emp.name}`;
      empTitle.getCell(1).font = { bold: true, size: 14, color: { argb: 'FF2A9299' } };
      empTitle.getCell(1).alignment = { horizontal: 'center' };
      empTitle.height = 24;

      empSheet.mergeCells('A2:J2');
      empSheet.getRow(2).getCell(1).value = `${roleLabels[emp.role] || emp.role} · ${dateLabel}`;
      empSheet.getRow(2).getCell(1).font = { italic: true, size: 11, color: { argb: 'FF888888' } };
      empSheet.getRow(2).getCell(1).alignment = { horizontal: 'center' };

      const empHeaderRow = empSheet.getRow(4);
      empHeaderRow.height = 22;
      detailHeaders.forEach((label, i) => {
        const cell = empHeaderRow.getCell(i + 1);
        cell.value = label;
        cell.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A9299' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' }, bottom: { style: 'thin' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      });

      let rowIdx = 5;
      let stt = 0;
      const empTotals = { quantity: 0, returned: 0, revenue: 0, discount: 0 };

      for (const order of empOrders) {
        empTotals.discount += Number(order.discount || 0);
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

          const row = empSheet.getRow(rowIdx);
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
          rowIdx++;
        }
      }

      // Tổng cộng của nhân viên
      const subRow = empSheet.getRow(rowIdx);
      subRow.height = 22;
      empSheet.mergeCells(`A${rowIdx}:F${rowIdx}`);
      subRow.getCell(1).value = `TỔNG CỘNG - ${emp.name}`;
      subRow.getCell(1).font = { bold: true, size: 12 };
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
          top: { style: 'medium' }, bottom: { style: 'medium' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      }
      // Nhãn cho cột tổng (dòng subRow) để rõ đây là doanh thu hàng
      subRow.getCell(9).value = 'DT hàng:';
      subRow.getCell(9).font = { bold: true, italic: true, color: { argb: 'FF788492' } };
      subRow.getCell(9).alignment = { horizontal: 'right' };
      rowIdx++;

      // (-) Chiết khấu đơn hàng
      const dcRow = empSheet.getRow(rowIdx);
      empSheet.mergeCells(`A${rowIdx}:I${rowIdx}`);
      dcRow.getCell(1).value = '(-) Chiết khấu đơn hàng';
      dcRow.getCell(1).font = { italic: true, color: { argb: 'FFE5A100' } };
      dcRow.getCell(1).alignment = { horizontal: 'right', indent: 1 };
      dcRow.getCell(10).value = empTotals.discount > 0 ? -empTotals.discount : 0;
      dcRow.getCell(10).numFmt = '#,##0';
      dcRow.getCell(10).alignment = { horizontal: 'right' };
      dcRow.getCell(10).font = { color: { argb: 'FFE5A100' } };
      rowIdx++;

      // = Doanh thu thực (sau chiết khấu) — khớp số trên web
      const netRow = empSheet.getRow(rowIdx);
      netRow.height = 22;
      empSheet.mergeCells(`A${rowIdx}:I${rowIdx}`);
      netRow.getCell(1).value = 'DOANH THU THỰC (sau chiết khấu)';
      netRow.getCell(1).font = { bold: true, size: 12, color: { argb: 'FF134E52' } };
      netRow.getCell(1).alignment = { horizontal: 'right', indent: 1 };
      netRow.getCell(10).value = empTotals.revenue - empTotals.discount;
      netRow.getCell(10).numFmt = '#,##0';
      netRow.getCell(10).alignment = { horizontal: 'right' };
      netRow.getCell(10).font = { bold: true, size: 12, color: { argb: 'FF134E52' } };
      for (let c = 1; c <= 10; c++) {
        netRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE9F7F8' } };
        netRow.getCell(c).border = {
          top: { style: 'thin' }, bottom: { style: 'double' },
          left: { style: 'thin' }, right: { style: 'thin' },
        };
      }

      empSheet.views = [{ state: 'frozen', ySplit: 4 }];
    }

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

// Export Excel chi tiết phẳng (kiểu dòng đơn giản theo ngày)
const exportSalesDetailFlatExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const ExcelJS = require('exceljs');

    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate + 'T23:59:59');

    const orderWhere = { status: { not: 'CANCELLED' } };
    if (Object.keys(dateFilter).length > 0) orderWhere.orderDate = dateFilter;

    if (req.user.role === 'SALES') {
      orderWhere.userId = req.user.id;
    }

    // Fetch all orders with items and returns
    const orders = await prisma.order.findMany({
      where: orderWhere,
      include: {
        items: {
          include: { product: { select: { sku: true } } },
        },
        returns: prisma.orderReturn ? { include: { items: true } } : undefined,
      },
      orderBy: { orderDate: 'asc' },
    });

    // Build flat rows
    const rows = [];
    let totalReturnAmount = 0;
    let totalNetRevenue = 0;
    let totalDiscount = 0;

    for (const order of orders) {
      // Map orderItemId -> returned quantity
      const returnedMap = new Map();
      if (order.returns && order.returns.length > 0) {
        for (const ret of order.returns) {
          for (const ri of ret.items) {
            const prev = returnedMap.get(ri.orderItemId) || 0;
            returnedMap.set(ri.orderItemId, prev + Number(ri.quantity));
          }
        }
      }

      // Order discount allocated proportionally per line
      const orderSubtotal = Number(order.subtotal) || 0;
      const orderDiscount = Number(order.discount) || 0;

      for (const item of order.items) {
        const qty = Number(item.quantity);
        const returnedQty = returnedMap.get(item.id) || 0;
        const unitPrice = Number(item.unitPrice);
        const lineTotal = qty * unitPrice;
        const returnAmount = returnedQty * unitPrice; // tiền hàng trả lại (số dương)
        const netRevenue = lineTotal - returnAmount;
        // Allocate discount proportional to line total
        const lineDiscount = orderSubtotal > 0
          ? Math.round((lineTotal / orderSubtotal) * orderDiscount)
          : 0;

        rows.push({
          date: order.orderDate,
          customerName: order.customerName || '',
          productName: item.productName || '',
          sku: item.product?.sku || '',
          returnAmount: returnAmount > 0 ? -returnAmount : 0, // hiển thị âm
          netRevenue,
          discount: lineDiscount,
        });

        totalReturnAmount += returnAmount > 0 ? -returnAmount : 0;
        totalNetRevenue += netRevenue;
        totalDiscount += lineDiscount;
      }
    }

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'BuyNow System';
    const sheet = workbook.addWorksheet('Chi tiết doanh thu');

    sheet.columns = [
      { width: 13 },  // A - Ngày
      { width: 26 },  // B - Tên khách hàng
      { width: 36 },  // C - Tên sản phẩm
      { width: 15 },  // D - Mã SKU
      { width: 18 },  // E - Tiền hàng trả lại
      { width: 18 },  // F - Doanh thu thuần
      { width: 15 },  // G - Chiết khấu
    ];

    // Row 1: Headers
    const headers = ['Ngày', 'Tên khách hàng', 'Tên sản phẩm', 'Mã SKU', 'Tiền hàng trả lại', 'Doanh thu thuần', 'Chiết khấu'];
    const headerRow = sheet.getRow(1);
    headerRow.height = 24;
    headers.forEach((label, i) => {
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

    // Row 2: Totals row
    const totalRow = sheet.getRow(2);
    totalRow.height = 22;
    totalRow.getCell(5).value = totalReturnAmount;
    totalRow.getCell(5).numFmt = '#,##0';
    totalRow.getCell(5).font = { bold: true, color: { argb: 'FFDE350B' } };
    totalRow.getCell(5).alignment = { horizontal: 'right' };

    totalRow.getCell(6).value = totalNetRevenue;
    totalRow.getCell(6).numFmt = '#,##0';
    totalRow.getCell(6).font = { bold: true, color: { argb: 'FF134E52' } };
    totalRow.getCell(6).alignment = { horizontal: 'right' };

    totalRow.getCell(7).value = totalDiscount;
    totalRow.getCell(7).numFmt = '#,##0';
    totalRow.getCell(7).font = { bold: true };
    totalRow.getCell(7).alignment = { horizontal: 'right' };

    for (let c = 1; c <= 7; c++) {
      totalRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF7E6' } };
      totalRow.getCell(c).border = {
        top: { style: 'thin' }, bottom: { style: 'medium' },
        left: { style: 'thin' }, right: { style: 'thin' },
      };
    }

    // Data rows from row 3
    rows.forEach((r, i) => {
      const row = sheet.getRow(3 + i);
      row.getCell(1).value = new Date(r.date).toLocaleDateString('vi-VN');
      row.getCell(1).alignment = { horizontal: 'center' };

      row.getCell(2).value = r.customerName;

      row.getCell(3).value = r.productName;

      row.getCell(4).value = r.sku;
      row.getCell(4).alignment = { horizontal: 'center' };

      if (r.returnAmount !== 0) {
        row.getCell(5).value = r.returnAmount;
        row.getCell(5).numFmt = '#,##0';
        row.getCell(5).alignment = { horizontal: 'right' };
        row.getCell(5).font = { color: { argb: 'FFDE350B' } };
      }

      row.getCell(6).value = r.netRevenue;
      row.getCell(6).numFmt = '#,##0';
      row.getCell(6).alignment = { horizontal: 'right' };

      if (r.discount > 0) {
        row.getCell(7).value = r.discount;
        row.getCell(7).numFmt = '#,##0';
        row.getCell(7).alignment = { horizontal: 'right' };
      }

      for (let c = 1; c <= 7; c++) {
        row.getCell(c).border = {
          top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
        };
      }
    });

    // Freeze header + total row
    sheet.views = [{ state: 'frozen', ySplit: 2 }];

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    const fileName = `Chi_tiet_doanh_thu_${startDate || 'all'}_${endDate || 'all'}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export sales detail flat excel error:', error);
    res.status(500).json({ success: false, message: 'Lỗi xuất Excel' });
  }
};

module.exports = { getRevenueByEmployee, getEmployeeOrders, exportEmployeeSalaryExcel, exportSalesDetailFlatExcel };
