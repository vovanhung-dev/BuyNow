// Generate unique code
const generateCode = (prefix, length = 6) => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 2 + length).toUpperCase();
  return `${prefix}${timestamp}${random}`.substring(0, prefix.length + length);
};

// Generate order code: HD + YYYYMMDD + random
const generateOrderCode = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `HD${dateStr}${random}`;
};

// Generate customer code
const generateCustomerCode = () => {
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `KH${random}`;
};

// Format currency VND
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount);
};

// Parse decimal from string (handle Vietnamese number format)
const parseDecimal = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  // Remove dots (thousand separator) and replace comma with dot
  const cleaned = value.toString().replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
};

module.exports = {
  generateCode,
  generateOrderCode,
  generateCustomerCode,
  formatCurrency,
  parseDecimal,
};
