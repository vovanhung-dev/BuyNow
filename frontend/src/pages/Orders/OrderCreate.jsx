import { useEffect, useState, memo, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Form, Select, DatePicker, InputNumber, Input, Button, Table, Card, Space, message, Divider, Row, Col, Tag, Grid, Modal
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  PhoneOutlined,
  EnvironmentOutlined,
  ShoppingCartOutlined,
  TagOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { customersAPI, productsAPI, ordersAPI, customerGroupsAPI, usersAPI } from '../../services/api'
import { useAuthStore } from '../../store'

const { useBreakpoint } = Grid

const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

// Controlled InputNumber that syncs properly to avoid mobile issues
const PriceInput = ({ value, onChange, ...props }) => {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  return (
    <InputNumber
      {...props}
      value={localValue}
      onChange={(v) => {
        setLocalValue(v)
        onChange(v)
      }}
    />
  )
}

// Mobile Order Item Card - optimized for touch
const OrderItemCard = ({ item, index, onQuantityChange, onPriceChange, onNoteChange, onRemove }) => (
  <div style={{
    padding: '16px',
    marginBottom: 12,
    background: '#fafbfc',
    borderRadius: 12,
    border: '1px solid #e8ecf0',
  }}>
    {/* Header: Name + Delete */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{ flex: 1, paddingRight: 8 }}>
        <div style={{ fontWeight: 600, color: '#2d3640', fontSize: 15, lineHeight: 1.3 }}>
          {item.name}
        </div>
        <div style={{ fontSize: 12, color: '#788492', marginTop: 4 }}>
          SKU: {item.sku} • {item.unit || '—'}
        </div>
      </div>
      <Button
        type="text"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onRemove(index)}
        style={{ marginTop: -4, marginRight: -8 }}
      />
    </div>

    {/* Quantity & Price Row */}
    <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
      {/* Quantity */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: '#788492', marginBottom: 6 }}>Số lượng</div>
        <PriceInput
          min={1}
          value={item.quantity}
          onChange={(v) => onQuantityChange(index, v)}
          style={{ width: '100%', height: 44 }}
          size="large"
        />
      </div>
      {/* Unit Price */}
      <div style={{ flex: 2 }}>
        <div style={{ fontSize: 12, color: '#788492', marginBottom: 6 }}>Đơn giá</div>
        <PriceInput
          min={0}
          value={item.unitPrice}
          onChange={(v) => onPriceChange(index, v)}
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => v.replace(/\,/g, '')}
          style={{ width: '100%', height: 44 }}
          size="large"
          addonAfter="đ"
        />
      </div>
    </div>

    {/* Total */}
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '10px 12px',
      background: '#e6f7f8',
      borderRadius: 8,
      marginBottom: 12,
    }}>
      <span style={{ color: '#134e52', fontWeight: 500 }}>Thành tiền</span>
      <span style={{ fontWeight: 700, color: '#2a9299', fontSize: 16 }}>{formatPrice(item.total)}</span>
    </div>

    {/* Note */}
    <Input
      placeholder="Ghi chú sản phẩm (nếu có)..."
      value={item.note}
      onChange={(e) => onNoteChange(index, e.target.value)}
      style={{ height: 40 }}
    />
  </div>
)

const OrderCreate = () => {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuthStore()
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER'
  const [form] = Form.useForm()
  const [customerForm] = Form.useForm()
  const [productForm] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [customerGroups, setCustomerGroups] = useState([])
  const [users, setUsers] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Quick add modals
  const [customerModalOpen, setCustomerModalOpen] = useState(false)
  const [productModalOpen, setProductModalOpen] = useState(false)
  const [customerSearchText, setCustomerSearchText] = useState('')
  const [productSearchText, setProductSearchText] = useState('')
  const [addingCustomer, setAddingCustomer] = useState(false)
  const [addingProduct, setAddingProduct] = useState(false)
  const [copyDataLoaded, setCopyDataLoaded] = useState(false)
  const [selectedProductIds, setSelectedProductIds] = useState([])

  useEffect(() => {
    loadData()
  }, [])

  // Load copy data after customers and products are loaded (only once)
  useEffect(() => {
    if (location.state?.copyFrom && customers.length > 0 && products.length > 0 && !copyDataLoaded) {
      setCopyDataLoaded(true)
      loadCopyData(location.state.copyFrom)
    }
  }, [customers, products, location.state?.copyFrom, copyDataLoaded])

  const loadData = async () => {
    setLoading(true)
    try {
      const promises = [
        customersAPI.getAll({ limit: 1000 }),
        productsAPI.getAll({ limit: 1000, active: 'true' }),
        customerGroupsAPI.getAll(),
      ]
      // Admin/Manager can see and select employees
      if (isAdminOrManager) {
        promises.push(usersAPI.getAll({ limit: 100 }))
      }
      const results = await Promise.all(promises)
      setCustomers(results[0].data || [])
      setProducts(results[1].data || [])
      setCustomerGroups(results[2].data || [])
      if (isAdminOrManager && results[3]) {
        setUsers(results[3].data || [])
      }
    } catch (error) {
      message.error('Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  // Load copy data from cancelled order
  const loadCopyData = async (orderId) => {
    try {
      const res = await ordersAPI.getById(orderId)
      const order = res.data
      if (order) {
        // Set customer and userId (for admin to keep same employee)
        const formValues = { customerId: order.customerId }
        if (isAdminOrManager && order.userId) {
          formValues.userId = order.userId
        }
        form.setFieldsValue(formValues)
        const customer = customers.find(c => c.id === order.customerId)
        setSelectedCustomer(customer || { id: order.customerId, name: order.customerName, customerGroup: null })

        // Set items
        const items = order.items.map(item => ({
          productId: item.productId,
          sku: item.product?.sku || '',
          name: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
          note: item.note || '',
        }))
        setOrderItems(items)
        message.success('Đã sao chép dữ liệu từ đơn hàng')
      }
    } catch (error) {
      message.error('Lỗi sao chép đơn hàng')
    }
  }

  // Quick add customer
  const handleAddCustomer = async () => {
    try {
      const values = await customerForm.validateFields()
      setAddingCustomer(true)

      const res = await customersAPI.create(values)
      if (res.success) {
        message.success('Thêm khách hàng thành công')
        setCustomers(prev => [res.data, ...prev])
        form.setFieldsValue({ customerId: res.data.id })
        handleCustomerChange(res.data.id)
        setCustomerModalOpen(false)
        customerForm.resetFields()
      }
    } catch (error) {
      message.error(error.message || 'Lỗi thêm khách hàng')
    } finally {
      setAddingCustomer(false)
    }
  }

  // Quick add product
  const handleAddProduct = async () => {
    try {
      const values = await productForm.validateFields()
      setAddingProduct(true)

      const res = await productsAPI.create({
        ...values,
        retailPrice: Number(values.retailPrice) || 0,
        wholesalePrice: Number(values.wholesalePrice) || 0,
        mediumDealerPrice: Number(values.mediumDealerPrice) || 0,
        largeDealerPrice: Number(values.largeDealerPrice) || 0,
        stock: 0,
        minStock: 10,
        active: true,
      })
      if (res.success) {
        message.success('Thêm sản phẩm thành công')
        setProducts(prev => [res.data, ...prev])
        handleAddProductToOrder(res.data.id)
        setProductModalOpen(false)
        productForm.resetFields()
      }
    } catch (error) {
      message.error(error.message || 'Lỗi thêm sản phẩm')
    } finally {
      setAddingProduct(false)
    }
  }

  // Open customer modal with search text
  const openCustomerModal = () => {
    customerForm.setFieldsValue({ name: customerSearchText })
    setCustomerModalOpen(true)
  }

  // Open product modal with search text
  const openProductModal = () => {
    productForm.setFieldsValue({ name: productSearchText })
    setProductModalOpen(true)
  }

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId)
    setSelectedCustomer(customer)
    if (orderItems.length > 0) {
      const priceType = customer?.customerGroup?.priceType || 'WHOLESALE'
      const newItems = orderItems.map((item) => {
        const product = products.find((p) => p.id === item.productId)
        if (product) {
          const unitPrice = getPrice(product, priceType)
          return { ...item, unitPrice, total: unitPrice * item.quantity }
        }
        return item
      })
      setOrderItems(newItems)
    }
  }

  const getPrice = (product, priceType) => {
    switch (priceType) {
      case 'WHOLESALE': return Number(product.wholesalePrice)
      case 'MEDIUM_DEALER': return Number(product.mediumDealerPrice)
      case 'LARGE_DEALER': return Number(product.largeDealerPrice)
      case 'RETAIL': return Number(product.retailPrice)
      default: return Number(product.wholesalePrice)
    }
  }

  const getPriceLabel = (priceType) => {
    const labels = {
      WHOLESALE: 'Giá bán buôn',
      MEDIUM_DEALER: 'Giá đại lý vừa',
      LARGE_DEALER: 'Giá đại lý lớn',
      RETAIL: 'Giá bán lẻ',
    }
    return labels[priceType] || 'Giá bán buôn'
  }

  const handleAddProductToOrder = (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    if (orderItems.find((item) => item.productId === productId)) {
      message.warning('Sản phẩm đã có trong đơn hàng')
      return
    }

    const priceType = selectedCustomer?.customerGroup?.priceType || 'WHOLESALE'
    const unitPrice = getPrice(product, priceType)

    setOrderItems([
      ...orderItems,
      {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        note: '',
      },
    ])
  }

  // Add multiple products at once
  const handleAddMultipleProducts = () => {
    if (selectedProductIds.length === 0) return

    const priceType = selectedCustomer?.customerGroup?.priceType || 'WHOLESALE'
    const newItems = []
    let skipped = 0

    selectedProductIds.forEach(productId => {
      // Skip if already in order
      if (orderItems.find((item) => item.productId === productId)) {
        skipped++
        return
      }

      const product = products.find((p) => p.id === productId)
      if (!product) return

      const unitPrice = getPrice(product, priceType)
      newItems.push({
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        quantity: 1,
        unitPrice,
        total: unitPrice,
        note: '',
      })
    })

    if (newItems.length > 0) {
      setOrderItems([...orderItems, ...newItems])
      message.success(`Đã thêm ${newItems.length} sản phẩm`)
    }
    if (skipped > 0) {
      message.warning(`Bỏ qua ${skipped} sản phẩm đã có trong đơn`)
    }
    setSelectedProductIds([])
  }

  const handleQuantityChange = useCallback((index, quantity) => {
    const qty = quantity || 1
    setOrderItems(prev => prev.map((item, i) =>
      i === index
        ? { ...item, quantity: qty, total: qty * item.unitPrice }
        : item
    ))
  }, [])

  const handlePriceChange = useCallback((index, price) => {
    const p = price ?? 0
    setOrderItems(prev => prev.map((item, i) =>
      i === index
        ? { ...item, unitPrice: p, total: p * item.quantity }
        : item
    ))
  }, [])

  const handleNoteChange = useCallback((index, note) => {
    setOrderItems(prev => prev.map((item, i) =>
      i === index
        ? { ...item, note }
        : item
    ))
  }, [])

  const handleRemoveItem = useCallback((index) => {
    setOrderItems(prev => prev.filter((_, i) => i !== index))
  }, [])

  const calculateTotals = () => {
    const subtotal = orderItems.reduce((sum, item) => sum + item.total, 0)
    const discount = form.getFieldValue('discount') || 0
    const total = subtotal - discount
    const paidAmount = form.getFieldValue('paidAmount') || 0
    const debtAmount = total - paidAmount
    return { subtotal, discount, total, paidAmount, debtAmount }
  }

  const handleSubmit = async () => {
    try {
      await form.validateFields()

      if (orderItems.length === 0) {
        message.error('Vui lòng thêm sản phẩm vào đơn hàng')
        return
      }

      const values = form.getFieldsValue()
      const totals = calculateTotals()

      setSubmitting(true)

      const orderData = {
        customerId: values.customerId,
        orderDate: values.orderDate?.format('YYYY-MM-DD'),
        items: orderItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          note: item.note,
        })),
        discount: totals.discount,
        paidAmount: totals.paidAmount,
        note: values.note,
      }
      // Admin/Manager can specify sales employee
      if (isAdminOrManager && values.userId) {
        orderData.userId = values.userId
      }
      const res = await ordersAPI.create(orderData)

      message.success('Tạo đơn hàng thành công!')
      navigate(`/orders/${res.data.id}`)
    } catch (error) {
      message.error(error.message || 'Lỗi tạo đơn hàng')
    } finally {
      setSubmitting(false)
    }
  }

  const totals = calculateTotals()

  const columns = [
    {
      title: 'STT',
      key: 'stt',
      width: 60,
      align: 'center',
      render: (_, __, i) => (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: '#eef9fa',
          color: '#2a9299',
          fontWeight: 600,
          fontSize: 13,
        }}>
          {i + 1}
        </span>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 110,
      render: (sku) => (
        <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#788492' }}>
          {sku}
        </span>
      ),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      render: (name) => (
        <span style={{ fontWeight: 500, color: '#2d3640' }}>{name}</span>
      ),
    },
    {
      title: 'ĐVT',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (unit) => (
        <Tag style={{ margin: 0 }}>{unit || '—'}</Tag>
      ),
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (val, _, index) => (
        <InputNumber
          min={1}
          value={val}
          onChange={(v) => handleQuantityChange(index, v)}
          size="small"
          style={{
            width: 70,
            borderRadius: 8,
          }}
        />
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 140,
      render: (val, _, index) => (
        <InputNumber
          min={0}
          value={val}
          onChange={(v) => handlePriceChange(index, v)}
          size="small"
          formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
          parser={(v) => v.replace(/\,/g, '')}
          style={{ width: 110 }}
        />
      ),
    },
    {
      title: 'Thành tiền',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#2a9299' }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: 150,
      render: (val, _, index) => (
        <Input
          placeholder="Ghi chú..."
          value={val}
          onChange={(e) => handleNoteChange(index, e.target.value)}
          size="small"
        />
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, __, index) => (
        <Button
          type="text"
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        />
      ),
    },
  ]

  return (
    <div className="animate-fade-in order-form" style={{ paddingBottom: isMobile ? 140 : 0 }}>
      {/* Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/orders')}
          />
          <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 600 }}>
            {isMobile ? 'Tạo đơn hàng' : 'Tạo đơn hàng mới'}
          </h1>
        </div>
        {!isMobile && (
          <Space>
            <Button onClick={() => navigate('/orders')}>
              Hủy bỏ
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={submitting}
            >
              Lưu đơn hàng
            </Button>
          </Space>
        )}
      </div>

      {isMobile ? (
        // Mobile Layout - Single Column
        <div>
          {/* Customer Selection - Compact */}
          <Card
            size="small"
            style={{ marginBottom: 12 }}
            bodyStyle={{ padding: 12 }}
          >
            <Form form={form} layout="vertical">
              <Form.Item
                name="customerId"
                label={<span style={{ fontWeight: 500 }}><UserOutlined /> Khách hàng</span>}
                rules={[{ required: true, message: 'Chọn khách hàng' }]}
                style={{ marginBottom: selectedCustomer ? 12 : 0 }}
              >
                <Select
                  showSearch
                  placeholder="Tìm khách hàng..."
                  optionFilterProp="label"
                  onChange={handleCustomerChange}
                  onSearch={setCustomerSearchText}
                  loading={loading}
                  size="large"
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={customers.map((c) => ({
                    value: c.id,
                    label: `${c.name} - ${c.code}`,
                  }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={openCustomerModal}
                        style={{ width: '100%', textAlign: 'left', color: '#2a9299' }}
                      >
                        Thêm khách hàng mới
                      </Button>
                    </>
                  )}
                />
              </Form.Item>

              {/* Employee Select - Only for Admin/Manager */}
              {isAdminOrManager && (
                <Form.Item
                  name="userId"
                  label={<span style={{ fontWeight: 500 }}>👤 Nhân viên bán</span>}
                  style={{ marginBottom: selectedCustomer ? 12 : 0 }}
                >
                  <Select
                    showSearch
                    allowClear
                    placeholder="Mặc định: bạn"
                    optionFilterProp="label"
                    size="large"
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    options={users.map((u) => ({
                      value: u.id,
                      label: `${u.name}${u.id === user?.id ? ' (Bạn)' : ''}`,
                    }))}
                  />
                </Form.Item>
              )}

              {selectedCustomer && (
                <div style={{
                  background: '#f0f9fa',
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                    <div>
                      <PhoneOutlined style={{ color: '#788492', marginRight: 4 }} />
                      <span style={{ color: '#134e52', fontWeight: 500 }}>
                        {selectedCustomer.phone || '—'}
                      </span>
                    </div>
                    <div>
                      <Tag color="processing" style={{ margin: 0 }}>
                        {selectedCustomer.customerGroup?.name || 'Khách lẻ'}
                      </Tag>
                    </div>
                    <div>
                      <Tag color="success" style={{ margin: 0 }}>
                        {getPriceLabel(selectedCustomer.customerGroup?.priceType)}
                      </Tag>
                    </div>
                  </div>
                  {selectedCustomer.address && (
                    <div style={{ marginTop: 8, color: '#566573', fontSize: 12 }}>
                      <EnvironmentOutlined style={{ marginRight: 4 }} />
                      {[selectedCustomer.address, selectedCustomer.ward, selectedCustomer.district]
                        .filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              )}

              <Form.Item
                name="orderDate"
                label="Ngày"
                initialValue={dayjs()}
                style={{ marginBottom: 0, marginTop: 12 }}
              >
                <DatePicker format="DD/MM/YYYY" style={{ width: '100%' }} size="large" />
              </Form.Item>
            </Form>
          </Card>

          {/* Product Search - Multi-select */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#fff',
            padding: '8px 0',
            marginBottom: 8,
          }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Select
                mode="multiple"
                showSearch
                placeholder="Chọn sản phẩm..."
                style={{ flex: 1 }}
                optionFilterProp="label"
                value={selectedProductIds}
                onChange={setSelectedProductIds}
                onSearch={setProductSearchText}
                loading={loading}
                size="large"
                maxTagCount={2}
                maxTagPlaceholder={(omitted) => `+${omitted.length}`}
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                options={products
                  .filter(p => !orderItems.find(item => item.productId === p.id))
                  .map((p) => ({
                    value: p.id,
                    label: `${p.sku} - ${p.name}`,
                  }))}
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <Divider style={{ margin: '8px 0' }} />
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={openProductModal}
                      style={{ width: '100%', textAlign: 'left', color: '#2a9299' }}
                    >
                      Thêm sản phẩm mới
                    </Button>
                  </>
                )}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddMultipleProducts}
                disabled={selectedProductIds.length === 0}
                size="large"
                style={{ minWidth: 50 }}
              />
            </div>
          </div>

          {/* Products List */}
          {orderItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#98a4b3',
              background: '#fafbfc',
              borderRadius: 12,
            }}>
              <ShoppingCartOutlined style={{ fontSize: 48, marginBottom: 12 }} />
              <p style={{ margin: 0, fontSize: 15 }}>Chưa có sản phẩm</p>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>
                Tìm và thêm sản phẩm ở trên
              </p>
            </div>
          ) : (
            <div>
              {orderItems.map((item, index) => (
                <OrderItemCard
                  key={item.productId}
                  item={item}
                  index={index}
                  onQuantityChange={handleQuantityChange}
                  onPriceChange={handlePriceChange}
                  onNoteChange={handleNoteChange}
                  onRemove={handleRemoveItem}
                />
              ))}
            </div>
          )}

          {/* Summary Section */}
          {orderItems.length > 0 && (
            <Card
              size="small"
              style={{ marginTop: 12 }}
              bodyStyle={{ padding: 12 }}
            >
              <Form form={form}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#788492' }}>Tổng tiền hàng ({orderItems.length} SP)</span>
                  <span style={{ fontWeight: 500 }}>{formatPrice(totals.subtotal)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#788492' }}>Chiết khấu</span>
                  <Form.Item name="discount" noStyle initialValue={0}>
                    <InputNumber
                      min={0}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => val.replace(/\,/g, '')}
                      style={{ width: 120 }}
                      size="small"
                      onChange={() => form.validateFields()}
                    />
                  </Form.Item>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ color: '#788492' }}>Thanh toán</span>
                  <Form.Item name="paidAmount" noStyle initialValue={0}>
                    <InputNumber
                      min={0}
                      max={totals.total}
                      formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                      parser={(val) => val.replace(/\,/g, '')}
                      style={{ width: 120 }}
                      size="small"
                      onChange={() => form.validateFields()}
                    />
                  </Form.Item>
                </div>

                <Form.Item name="note" style={{ marginBottom: 0, marginTop: 12 }}>
                  <Input.TextArea
                    rows={2}
                    placeholder="Ghi chú đơn hàng..."
                    style={{ resize: 'none' }}
                  />
                </Form.Item>
              </Form>
            </Card>
          )}
        </div>
      ) : (
        // Desktop Layout - Two Columns
        <Row gutter={24}>
          <Col xs={24} lg={16}>
            {/* Customer Info Card */}
            <Card
              title={
                <Space>
                  <UserOutlined style={{ color: '#2a9299' }} />
                  <span>Thông tin khách hàng</span>
                </Space>
              }
              style={{ marginBottom: 24 }}
            >
              <Form form={form} layout="vertical">
                <Row gutter={16}>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name="customerId"
                      label="Khách hàng"
                      rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
                    >
                      <Select
                        showSearch
                        placeholder="Tìm và chọn khách hàng..."
                        optionFilterProp="label"
                        onChange={handleCustomerChange}
                        onSearch={setCustomerSearchText}
                        loading={loading}
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                        options={customers.map((c) => ({
                          value: c.id,
                          label: `${c.name} - ${c.code}`,
                        }))}
                        dropdownRender={(menu) => (
                          <>
                            {menu}
                            <Divider style={{ margin: '8px 0' }} />
                            <Button
                              type="text"
                              icon={<PlusOutlined />}
                              onClick={openCustomerModal}
                              style={{ width: '100%', textAlign: 'left', color: '#2a9299' }}
                            >
                              Thêm khách hàng mới
                            </Button>
                          </>
                        )}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item
                      name="orderDate"
                      label="Ngày đặt hàng"
                      initialValue={dayjs()}
                    >
                      <DatePicker
                        format="DD/MM/YYYY"
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Employee Select - Only for Admin/Manager */}
                {isAdminOrManager && (
                  <Row gutter={24} style={{ marginTop: 16 }}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        name="userId"
                        label="Nhân viên bán"
                      >
                        <Select
                          showSearch
                          allowClear
                          placeholder="Mặc định: bạn (người đang đăng nhập)"
                          optionFilterProp="label"
                          filterOption={(input, option) =>
                            (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                          }
                          options={users.map((u) => ({
                            value: u.id,
                            label: `${u.name}${u.id === user?.id ? ' (Bạn)' : ''}`,
                          }))}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                )}

                {selectedCustomer && (
                  <div style={{
                    background: 'linear-gradient(135deg, #eef9fa, #d4f0f2)',
                    padding: 20,
                    borderRadius: 12,
                    marginTop: 8,
                  }}>
                    <Row gutter={24}>
                      <Col xs={24} md={8}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>
                            <PhoneOutlined style={{ marginRight: 6 }} />
                            Số điện thoại
                          </div>
                          <div style={{ fontWeight: 500, color: '#134e52' }}>
                            {selectedCustomer.phone || '—'}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={8}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>
                            <TagOutlined style={{ marginRight: 6 }} />
                            Nhóm khách hàng
                          </div>
                          <div style={{ fontWeight: 500 }}>
                            <Tag color="processing" style={{ margin: 0 }}>
                              {selectedCustomer.customerGroup?.name || 'Khách lẻ'}
                            </Tag>
                          </div>
                        </div>
                      </Col>
                      <Col xs={24} md={8}>
                        <div style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>
                            <TagOutlined style={{ marginRight: 6 }} />
                            Áp dụng giá
                          </div>
                          <div style={{ fontWeight: 500, color: '#22a06b' }}>
                            {getPriceLabel(selectedCustomer.customerGroup?.priceType)}
                          </div>
                        </div>
                      </Col>
                      <Col xs={24}>
                        <div>
                          <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>
                            <EnvironmentOutlined style={{ marginRight: 6 }} />
                            Địa chỉ
                          </div>
                          <div style={{ fontWeight: 500, color: '#134e52' }}>
                            {[selectedCustomer.address, selectedCustomer.ward, selectedCustomer.district]
                              .filter(Boolean).join(', ') || '—'}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                )}
              </Form>
            </Card>

            {/* Products Card */}
            <Card
              title={
                <Space>
                  <ShoppingCartOutlined style={{ color: '#2a9299' }} />
                  <span>Sản phẩm</span>
                  {orderItems.length > 0 && (
                    <Tag color="processing">{orderItems.length}</Tag>
                  )}
                </Space>
              }
            >
              <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                <Select
                  mode="multiple"
                  showSearch
                  placeholder="Chọn nhiều sản phẩm cùng lúc..."
                  style={{ flex: 1 }}
                  optionFilterProp="label"
                  value={selectedProductIds}
                  onChange={setSelectedProductIds}
                  onSearch={setProductSearchText}
                  loading={loading}
                  size="large"
                  maxTagCount={3}
                  maxTagPlaceholder={(omitted) => `+${omitted.length} sản phẩm`}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={products
                    .filter(p => !orderItems.find(item => item.productId === p.id))
                    .map((p) => ({
                      value: p.id,
                      label: `${p.sku} - ${p.name}`,
                    }))}
                  dropdownRender={(menu) => (
                    <>
                      {menu}
                      <Divider style={{ margin: '8px 0' }} />
                      <Button
                        type="text"
                        icon={<PlusOutlined />}
                        onClick={openProductModal}
                        style={{ width: '100%', textAlign: 'left', color: '#2a9299' }}
                      >
                        Thêm sản phẩm mới
                      </Button>
                    </>
                  )}
                />
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddMultipleProducts}
                  disabled={selectedProductIds.length === 0}
                  size="large"
                >
                  Thêm ({selectedProductIds.length})
                </Button>
              </div>

              {orderItems.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '48px 0',
                  color: '#98a4b3',
                }}>
                  <ShoppingCartOutlined style={{ fontSize: 48, marginBottom: 12 }} />
                  <p style={{ margin: 0, fontSize: 16 }}>Chưa có sản phẩm nào</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                    Tìm kiếm và thêm sản phẩm vào đơn hàng
                  </p>
                </div>
              ) : (
                <Table
                  dataSource={orderItems}
                  columns={columns}
                  rowKey="productId"
                  pagination={false}
                  size="middle"
                />
              )}
            </Card>
          </Col>

          {/* Right Column - Summary */}
          <Col xs={24} lg={8}>
            <Card
              title={
                <Space>
                  <TagOutlined style={{ color: '#d4a853' }} />
                  <span>Tổng cộng</span>
                </Space>
              }
              style={{ position: 'sticky', top: 88 }}
            >
              <Form form={form} layout="vertical">
                <div className="total-section">
                  <div className="total-row">
                    <span style={{ color: '#788492' }}>Tổng tiền hàng</span>
                    <span style={{ fontWeight: 500 }}>{formatPrice(totals.subtotal)}</span>
                  </div>

                  <div className="total-row" style={{ alignItems: 'flex-start' }}>
                    <span style={{ color: '#788492', paddingTop: 8 }}>Chiết khấu</span>
                    <Form.Item name="discount" noStyle initialValue={0}>
                      <InputNumber
                        min={0}
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => val.replace(/\,/g, '')}
                        style={{ width: 140 }}
                        onChange={() => form.validateFields()}
                        addonAfter="đ"
                      />
                    </Form.Item>
                  </div>

                  <Divider style={{ margin: '16px 0' }} />

                  <div className="total-row grand-total">
                    <span className="label">Tổng thanh toán</span>
                    <span className="value">{formatPrice(totals.total)}</span>
                  </div>

                  <div className="total-row" style={{ alignItems: 'flex-start', marginTop: 16 }}>
                    <span style={{ color: '#788492', paddingTop: 8 }}>Thanh toán</span>
                    <Form.Item name="paidAmount" noStyle initialValue={0}>
                      <InputNumber
                        min={0}
                        max={totals.total}
                        formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                        parser={(val) => val.replace(/\,/g, '')}
                        style={{ width: 140 }}
                        onChange={() => form.validateFields()}
                        addonAfter="đ"
                      />
                    </Form.Item>
                  </div>

                  <div className={`debt-amount ${totals.debtAmount <= 0 ? 'paid' : ''}`}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}>
                      <span style={{
                        fontWeight: 500,
                        color: totals.debtAmount > 0 ? '#de350b' : '#22a06b',
                      }}>
                        {totals.debtAmount > 0 ? 'Còn nợ' : 'Đã thanh toán đủ'}
                      </span>
                      <span style={{
                        fontWeight: 700,
                        fontSize: 18,
                        color: totals.debtAmount > 0 ? '#de350b' : '#22a06b',
                      }}>
                        {formatPrice(Math.abs(totals.debtAmount))}
                      </span>
                    </div>
                  </div>
                </div>

                <Divider />

                <Form.Item name="note" label="Ghi chú">
                  <Input.TextArea
                    rows={3}
                    placeholder="Ghi chú cho đơn hàng..."
                    style={{ resize: 'none' }}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  size="large"
                  block
                  icon={<SaveOutlined />}
                  onClick={handleSubmit}
                  loading={submitting}
                  disabled={orderItems.length === 0 || !selectedCustomer}
                >
                  Tạo đơn hàng
                </Button>
              </Form>
            </Card>
          </Col>
        </Row>
      )}

      {/* Mobile Fixed Footer with Total */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: '#fff',
          boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
          zIndex: 100,
        }}>
          {/* Total Summary Row */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 16px',
            borderBottom: '1px solid #f0f0f0',
            background: totals.debtAmount > 0 ? '#fff8f7' : '#f6fff9',
          }}>
            <div>
              <div style={{ fontSize: 12, color: '#788492' }}>Tổng thanh toán</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#2a9299' }}>
                {formatPrice(totals.total)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 12, color: totals.debtAmount > 0 ? '#de350b' : '#22a06b' }}>
                {totals.debtAmount > 0 ? 'Còn nợ' : 'Đã thanh toán đủ'}
              </div>
              <div style={{
                fontSize: 16,
                fontWeight: 600,
                color: totals.debtAmount > 0 ? '#de350b' : '#22a06b',
              }}>
                {formatPrice(Math.abs(totals.debtAmount))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 12,
            padding: '12px 16px',
          }}>
            <Button
              onClick={() => navigate('/orders')}
              style={{ flex: 1, height: 44 }}
            >
              Hủy
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSubmit}
              loading={submitting}
              disabled={orderItems.length === 0 || !selectedCustomer}
              style={{ flex: 2, height: 44 }}
            >
              Lưu đơn hàng
            </Button>
          </div>
        </div>
      )}

      {/* Quick Add Modals */}
      <QuickAddCustomerModal
        open={customerModalOpen}
        onCancel={() => setCustomerModalOpen(false)}
        onOk={handleAddCustomer}
        form={customerForm}
        loading={addingCustomer}
        customerGroups={customerGroups}
      />
      <QuickAddProductModal
        open={productModalOpen}
        onCancel={() => setProductModalOpen(false)}
        onOk={handleAddProduct}
        form={productForm}
        loading={addingProduct}
      />
    </div>
  )
}

// Quick Add Customer Modal
const QuickAddCustomerModal = ({ open, onCancel, onOk, form, loading, customerGroups }) => (
  <Modal
    title="Thêm khách hàng mới"
    open={open}
    onCancel={onCancel}
    onOk={onOk}
    okText="Thêm"
    cancelText="Hủy"
    confirmLoading={loading}
  >
    <Form form={form} layout="vertical">
      <Form.Item
        name="name"
        label="Tên khách hàng"
        rules={[{ required: true, message: 'Nhập tên khách hàng' }]}
      >
        <Input placeholder="Tên khách hàng" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="0123456789" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="customerGroupId" label="Nhóm khách hàng">
            <Select placeholder="Chọn nhóm" allowClear>
              {customerGroups.map(g => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Form.Item name="address" label="Địa chỉ">
        <Input placeholder="Địa chỉ" />
      </Form.Item>
    </Form>
  </Modal>
)

// Quick Add Product Modal
const QuickAddProductModal = ({ open, onCancel, onOk, form, loading }) => (
  <Modal
    title="Thêm sản phẩm mới"
    open={open}
    onCancel={onCancel}
    onOk={onOk}
    okText="Thêm"
    cancelText="Hủy"
    confirmLoading={loading}
    width={600}
  >
    <Form form={form} layout="vertical">
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="sku"
            label="Mã SKU"
            rules={[{ required: true, message: 'Nhập mã SKU' }]}
          >
            <Input placeholder="VD: SP001" />
          </Form.Item>
        </Col>
        <Col span={16}>
          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}
          >
            <Input placeholder="Tên sản phẩm" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="unit" label="Đơn vị tính">
            <Input placeholder="VD: Thùng, Hộp" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="retailPrice"
            label="Giá bán lẻ"
            rules={[{ required: true, message: 'Nhập giá' }]}
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="wholesalePrice" label="Giá bán buôn">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="mediumDealerPrice" label="Giá đại lý vừa">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="largeDealerPrice" label="Giá đại lý lớn">
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={v => v.replace(/,/g, '')}
              placeholder="0"
            />
          </Form.Item>
        </Col>
      </Row>
    </Form>
  </Modal>
)

export default OrderCreate
