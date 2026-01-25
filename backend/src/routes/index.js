const express = require('express');
const router = express.Router();

const { authMiddleware, requireRole } = require('../middlewares/auth.middleware');

// Controllers
const authController = require('../controllers/auth.controller');
const userController = require('../controllers/user.controller');
const customerGroupController = require('../controllers/customerGroup.controller');
const customerController = require('../controllers/customer.controller');
const productController = require('../controllers/product.controller');
const orderController = require('../controllers/order.controller');
const paymentController = require('../controllers/payment.controller');
const stockController = require('../controllers/stock.controller');
const reportController = require('../controllers/report.controller');
const returnController = require('../controllers/return.controller');

// ==================== AUTH ROUTES ====================
router.post('/auth/login', authController.login);
router.get('/auth/me', authMiddleware, authController.me);
router.put('/auth/change-password', authMiddleware, authController.changePassword);

// ==================== USER ROUTES ====================
router.get('/users', authMiddleware, requireRole('ADMIN', 'MANAGER'), userController.getAll);
router.get('/users/:id', authMiddleware, requireRole('ADMIN', 'MANAGER'), userController.getById);
router.post('/users', authMiddleware, requireRole('ADMIN'), userController.create);
router.put('/users/:id', authMiddleware, requireRole('ADMIN'), userController.update);
router.delete('/users/:id', authMiddleware, requireRole('ADMIN'), userController.remove);

// ==================== CUSTOMER GROUP ROUTES ====================
router.get('/customer-groups', authMiddleware, customerGroupController.getAll);
router.get('/customer-groups/:id', authMiddleware, customerGroupController.getById);
router.post('/customer-groups', authMiddleware, requireRole('ADMIN', 'MANAGER'), customerGroupController.create);
router.put('/customer-groups/:id', authMiddleware, requireRole('ADMIN', 'MANAGER'), customerGroupController.update);
router.delete('/customer-groups/:id', authMiddleware, requireRole('ADMIN', 'MANAGER'), customerGroupController.remove);

// ==================== CUSTOMER ROUTES ====================
router.get('/customers', authMiddleware, customerController.getAll);
router.get('/customers/:id', authMiddleware, customerController.getById);
router.get('/customers/:id/orders', authMiddleware, customerController.getOrders);
router.get('/customers/:id/debt', authMiddleware, customerController.getDebt);
router.post('/customers', authMiddleware, customerController.create);
router.put('/customers/:id', authMiddleware, customerController.update);
router.delete('/customers/:id', authMiddleware, requireRole('ADMIN', 'MANAGER'), customerController.remove);

// ==================== PRODUCT ROUTES ====================
router.get('/products', authMiddleware, productController.getAll);
router.get('/products/low-stock', authMiddleware, productController.getLowStock);
router.get('/products/:id', authMiddleware, productController.getById);
router.get('/products/:id/price/:priceType', authMiddleware, productController.getPrice);
router.post('/products', authMiddleware, requireRole('ADMIN', 'MANAGER'), productController.create);
router.put('/products/:id', authMiddleware, requireRole('ADMIN', 'MANAGER'), productController.update);
router.delete('/products/:id', authMiddleware, requireRole('ADMIN', 'MANAGER'), productController.remove);

// ==================== ORDER ROUTES ====================
router.get('/orders', authMiddleware, orderController.getAll);
router.get('/orders/:id', authMiddleware, orderController.getById);
router.post('/orders', authMiddleware, orderController.create);
router.put('/orders/:id/status', authMiddleware, orderController.updateStatus);
router.delete('/orders/:id', authMiddleware, orderController.cancel);

// ==================== PAYMENT ROUTES ====================
router.get('/payments', authMiddleware, paymentController.getAll);
router.get('/payments/:id', authMiddleware, paymentController.getById);
router.post('/payments', authMiddleware, paymentController.create);

// ==================== STOCK ROUTES ====================
router.get('/stock', authMiddleware, stockController.getStock);
router.get('/stock/logs', authMiddleware, stockController.getLogs);
router.get('/stock/alerts', authMiddleware, stockController.getAlerts);
router.post('/stock/import', authMiddleware, requireRole('ADMIN', 'MANAGER'), stockController.importStock);
router.post('/stock/bulk-import', authMiddleware, requireRole('ADMIN', 'MANAGER'), stockController.bulkImport);
router.post('/stock/adjust', authMiddleware, requireRole('ADMIN', 'MANAGER'), stockController.adjustStock);

// ==================== REPORT ROUTES ====================
router.get('/reports/by-employee', authMiddleware, reportController.getRevenueByEmployee);
router.get('/reports/by-employee/:id', authMiddleware, reportController.getEmployeeOrders);

// ==================== RETURN ROUTES ====================
router.get('/returns', authMiddleware, returnController.getAll);
router.get('/returns/:id', authMiddleware, returnController.getById);
router.get('/orders/:orderId/returns', authMiddleware, returnController.getByOrder);
router.post('/returns', authMiddleware, returnController.create);

module.exports = router;
