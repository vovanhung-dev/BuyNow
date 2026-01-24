import { useEffect, useState, memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form, Select, DatePicker, InputNumber, Input, Button, Table, Card, Space, message, Divider, Row, Col, Tag, Grid
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
import { customersAPI, productsAPI, ordersAPI } from '../../services/api'

const { useBreakpoint } = Grid

const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

// Controlled InputNumber that syncs on blur to avoid mobile issues
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

// Mobile Order Item Card - định nghĩa bên ngoài để tránh re-create component
const OrderItemCard = ({ item, index, onQuantityChange, onPriceChange, onNoteChange, onRemove }) => (
  <div style={{
    padding: '12px 0',
    borderBottom: '1px solid #f0f0f0',
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 500, color: '#2d3640' }}>{item.name}</div>
        <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
          SKU: {item.sku} | {item.unit || '—'}
        </div>
      </div>
      <Button
        type="text"
        size="small"
        danger
        icon={<DeleteOutlined />}
        onClick={() => onRemove(index)}
      />
    </div>
    <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: '#788492' }}>SL:</span>
        <PriceInput
          min={1}
          value={item.quantity}
          onChange={(v) => onQuantityChange(index, v)}
          size="small"
          style={{ width: 60 }}
        />
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 12, color: '#788492' }}>Giá:</span>
          <PriceInput
            min={0}
            value={item.unitPrice}
            onChange={(v) => onPriceChange(index, v)}
            size="small"
            formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={(v) => v.replace(/\,/g, '')}
            style={{ width: 100 }}
          />
        </div>
        <div style={{ fontWeight: 600, color: '#2a9299', marginTop: 4 }}>{formatPrice(item.total)}</div>
      </div>
    </div>
    <div style={{ marginTop: 8 }}>
      <Input
        placeholder="Ghi chú sản phẩm..."
        value={item.note}
        onChange={(e) => onNoteChange(index, e.target.value)}
        size="small"
      />
    </div>
  </div>
)

const OrderCreate = () => {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [customers, setCustomers] = useState([])
  const [products, setProducts] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [orderItems, setOrderItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [customersRes, productsRes] = await Promise.all([
        customersAPI.getAll({ limit: 1000 }),
        productsAPI.getAll({ limit: 1000, active: 'true' }),
      ])
      setCustomers(customersRes.data || [])
      setProducts(productsRes.data || [])
    } catch (error) {
      message.error('Lỗi tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }

  const handleCustomerChange = (customerId) => {
    const customer = customers.find((c) => c.id === customerId)
    setSelectedCustomer(customer)
    if (orderItems.length > 0) {
      const priceType = customer?.customerGroup?.priceType || 'RETAIL'
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
      default: return Number(product.retailPrice)
    }
  }

  const getPriceLabel = (priceType) => {
    const labels = {
      WHOLESALE: 'Giá bán buôn',
      MEDIUM_DEALER: 'Giá đại lý vừa',
      LARGE_DEALER: 'Giá đại lý lớn',
      RETAIL: 'Giá bán lẻ',
    }
    return labels[priceType] || 'Giá bán lẻ'
  }

  const handleAddProduct = (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    if (orderItems.find((item) => item.productId === productId)) {
      message.warning('Sản phẩm đã có trong đơn hàng')
      return
    }

    const priceType = selectedCustomer?.customerGroup?.priceType || 'RETAIL'
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

      const res = await ordersAPI.create({
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
      })

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
    <div className="animate-fade-in order-form">
      {/* Page Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/orders')}
            size={isMobile ? 'middle' : 'middle'}
          />
          <h1 style={{ margin: 0, fontSize: isMobile ? 16 : 20, fontWeight: 600 }}>Tạo đơn hàng mới</h1>
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

      <Row gutter={24}>
        {/* Left Column - Customer & Products */}
        <Col xs={24} lg={16}>
          {/* Customer Info Card */}
          <Card
            title={
              <Space>
                <UserOutlined style={{ color: '#2a9299' }} />
                <span>Thông tin khách hàng</span>
              </Space>
            }
            style={{ marginBottom: isMobile ? 16 : 24 }}
            size={isMobile ? 'small' : 'default'}
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
                      loading={loading}
                      filterOption={(input, option) =>
                        (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                      }
                      options={customers.map((c) => ({
                        value: c.id,
                        label: `${c.name} - ${c.code}`,
                      }))}
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
            size={isMobile ? 'small' : 'default'}
            style={{ marginBottom: isMobile ? 16 : 0 }}
          >
            <div style={{ marginBottom: 16 }}>
              <Select
                showSearch
                placeholder="Tìm và thêm sản phẩm..."
                style={{ width: '100%' }}
                optionFilterProp="label"
                onChange={handleAddProduct}
                value={null}
                loading={loading}
                size="large"
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                suffixIcon={<PlusOutlined style={{ color: '#2a9299' }} />}
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.sku} - ${p.name}`,
                }))}
              />
            </div>

            {orderItems.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: isMobile ? '32px 0' : '48px 0',
                color: '#98a4b3',
              }}>
                <ShoppingCartOutlined style={{ fontSize: isMobile ? 36 : 48, marginBottom: 12 }} />
                <p style={{ margin: 0, fontSize: isMobile ? 14 : 16 }}>Chưa có sản phẩm nào</p>
                <p style={{ margin: '4px 0 0', fontSize: 12 }}>
                  Tìm kiếm và thêm sản phẩm vào đơn hàng
                </p>
              </div>
            ) : isMobile ? (
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
            style={{ position: isMobile ? 'relative' : 'sticky', top: isMobile ? 0 : 88 }}
            size={isMobile ? 'small' : 'default'}
          >
            <Form form={form} layout="vertical">
              <div className="total-section">
                {/* Subtotal */}
                <div className="total-row">
                  <span style={{ color: '#788492' }}>Tổng tiền hàng</span>
                  <span style={{ fontWeight: 500 }}>{formatPrice(totals.subtotal)}</span>
                </div>

                {/* Discount */}
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

                {/* Grand Total */}
                <div className="total-row grand-total">
                  <span className="label">Tổng thanh toán</span>
                  <span className="value">{formatPrice(totals.total)}</span>
                </div>

                {/* Payment */}
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

                {/* Debt Amount */}
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

              {/* Note */}
              <Form.Item name="note" label="Ghi chú">
                <Input.TextArea
                  rows={3}
                  placeholder="Ghi chú cho đơn hàng..."
                  style={{ resize: 'none' }}
                />
              </Form.Item>

              {/* Actions */}
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

      {/* Mobile Fixed Footer */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#fff',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.1)',
          zIndex: 100,
          display: 'flex',
          gap: 12,
        }}>
          <Button onClick={() => navigate('/orders')} style={{ flex: 1 }}>
            Hủy
          </Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSubmit}
            loading={submitting}
            disabled={orderItems.length === 0 || !selectedCustomer}
            style={{ flex: 2 }}
          >
            Lưu đơn hàng
          </Button>
        </div>
      )}
    </div>
  )
}

export default OrderCreate
