const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const ExcelJS = require('exceljs');
const path = require('path');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');

  // 1. Create default admin user
  const adminPassword = await bcrypt.hash('123456', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@buynow.com' },
    update: {},
    create: {
      email: 'admin@buynow.com',
      password: adminPassword,
      name: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Created admin user:', admin.email);

  // 2. Create default customer groups
  const customerGroups = [
    { code: 'DLN', name: 'Đại lý nhỏ', priceType: 'WHOLESALE' },
    { code: 'DLV', name: 'Đại lý vừa', priceType: 'MEDIUM_DEALER' },
    { code: 'dailylon', name: 'Đại lý lớn', priceType: 'LARGE_DEALER' },
    { code: 'RETAIL', name: 'Khách lẻ', priceType: 'RETAIL' },
  ];

  for (const group of customerGroups) {
    await prisma.customerGroup.upsert({
      where: { code: group.code },
      update: {},
      create: group,
    });
  }
  console.log('Created customer groups');

  // 3. Import data from Excel
  const excelPath = path.join(__dirname, '../../DS SẢN PHẨM.xlsx');

  try {
    console.log('Reading Excel file:', excelPath);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    // Get customer group mapping
    const groups = await prisma.customerGroup.findMany();
    const groupMap = {};
    groups.forEach(g => {
      groupMap[g.code.toLowerCase()] = g.id;
    });

    // Import customers from "KHÁCH HÀNG" sheet
    const customerSheet = workbook.getWorksheet('KHÁCH HÀNG');
    if (customerSheet) {
      console.log('Importing customers...');
      const customers = [];

      customerSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const name = row.getCell(1).value?.toString()?.trim();
        const groupCode = row.getCell(2).value?.toString()?.trim()?.toLowerCase();
        const code = row.getCell(3).value?.toString()?.trim();
        const address = row.getCell(4).value?.toString()?.trim();
        const phone = row.getCell(5).value?.toString()?.trim();
        const district = row.getCell(6).value?.toString()?.trim();
        const ward = row.getCell(7).value?.toString()?.trim();

        if (name && code) {
          customers.push({
            code,
            name,
            customerGroupId: groupMap[groupCode] || groupMap['dln'] || groups[0]?.id,
            address: address || null,
            phone: phone || null,
            district: district || null,
            ward: ward || null,
          });
        }
      });

      console.log(`Found ${customers.length} customers to import`);

      // Insert customers in batches
      let imported = 0;
      for (const customer of customers) {
        try {
          await prisma.customer.upsert({
            where: { code: customer.code },
            update: {
              name: customer.name,
              customerGroupId: customer.customerGroupId,
              address: customer.address,
              phone: customer.phone,
              district: customer.district,
              ward: customer.ward,
            },
            create: customer,
          });
          imported++;
        } catch (e) {
          console.log(`Error importing customer ${customer.code}:`, e.message);
        }
      }

      console.log(`Imported ${imported} customers`);
    } else {
      console.log('Sheet "KHÁCH HÀNG" not found');
    }

    // Import products from "SẢN PHẨM" sheet
    const productSheet = workbook.getWorksheet('SẢN PHẨM');
    if (productSheet) {
      console.log('Importing products...');
      const products = [];

      // Parse price value (handle Vietnamese number format)
      const parsePrice = (val) => {
        if (!val) return 0;
        // Handle ExcelJS cell value types
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val.result !== undefined) return val.result;
        // String: remove dots (thousands separator) and handle comma as decimal
        const str = val.toString().replace(/\./g, '').replace(',', '.');
        return parseFloat(str) || 0;
      };

      productSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header

        const name = row.getCell(1).value?.toString()?.trim();
        const sku = row.getCell(2).value?.toString()?.trim();
        const unit = row.getCell(3).value?.toString()?.trim();
        const wholesalePrice = parsePrice(row.getCell(4).value);
        const mediumDealerPrice = parsePrice(row.getCell(5).value);
        const largeDealerPrice = parsePrice(row.getCell(6).value);
        const retailPrice = parsePrice(row.getCell(7).value);

        if (sku) {
          products.push({
            sku,
            name: name || sku,
            unit: unit || 'Cái',
            wholesalePrice,
            mediumDealerPrice: mediumDealerPrice || wholesalePrice,
            largeDealerPrice: largeDealerPrice || mediumDealerPrice || wholesalePrice,
            retailPrice: retailPrice || wholesalePrice,
            stock: 100, // Default stock
            minStock: 10,
          });
        }
      });

      console.log(`Found ${products.length} products to import`);

      // Insert products
      let imported = 0;
      for (const product of products) {
        try {
          await prisma.product.upsert({
            where: { sku: product.sku },
            update: {
              name: product.name,
              unit: product.unit,
              wholesalePrice: product.wholesalePrice,
              mediumDealerPrice: product.mediumDealerPrice,
              largeDealerPrice: product.largeDealerPrice,
              retailPrice: product.retailPrice,
            },
            create: product,
          });
          imported++;
        } catch (e) {
          console.log(`Error importing product ${product.sku}:`, e.message);
        }
      }

      console.log(`Imported ${imported} products`);
    } else {
      console.log('Sheet "SẢN PHẨM" not found');
    }

  } catch (error) {
    console.log('Error reading Excel file:', error.message);
    console.log('You can import data later via API or by fixing the Excel path.');
  }

  console.log('Seed completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
