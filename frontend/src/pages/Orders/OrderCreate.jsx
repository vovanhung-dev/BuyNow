import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Form, Select, DatePicker, InputNumber, Input, Button, Table, Card, Space, Typography, message, Divider
} from 'antd'
import { PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { customersAPI, productsAPI, ordersAPI } from '../../services/api'

const { Title, Text } = Typography

const OrderCreate = () => {
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
    // Recalculate prices based on customer group
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

  const handleAddProduct = (productId) => {
    const product = products.find((p) => p.id === productId)
    if (!product) return

    // Check if already added
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
      },
    ])
  }

  const handleQuantityChange = (index, quantity) => {
    const newItems = [...orderItems]
    newItems[index].quantity = quantity
    newItems[index].total = quantity * newItems[index].unitPrice
    setOrderItems(newItems)
  }

  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

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
  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  const columns = [
    { title: 'STT', key: 'stt', width: 50, render: (_, __, i) => i + 1 },
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 100 },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 70 },
    {
      title: 'SL',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (val, _, index) => (
        <InputNumber
          min={1}
          value={val}
          onChange={(v) => handleQuantityChange(index, v)}
          size="small"
          style={{ width: 60 }}
        />
      ),
    },
    {
      title: 'Đơn giá',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      render: formatPrice,
    },
    {
      title: 'Thành tiền',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: formatPrice,
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, __, index) => (
        <Button
          size="small"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveItem(index)}
        />
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Tạo đơn hàng</Title>
        <Space>
          <Button onClick={() => navigate('/orders')}>Hủy</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSubmit} loading={submitting}>
            Lưu đơn hàng
          </Button>
        </Space>
      </div>

      <Card title="Thông tin khách hàng" style={{ marginBottom: 16 }}>
        <Form form={form} layout="vertical">
          <Space style={{ display: 'flex' }} wrap>
            <Form.Item
              name="customerId"
              label="Khách hàng"
              rules={[{ required: true, message: 'Vui lòng chọn khách hàng' }]}
            >
              <Select
                showSearch
                placeholder="Chọn khách hàng"
                style={{ width: 300 }}
                optionFilterProp="children"
                onChange={handleCustomerChange}
                loading={loading}
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {customers.map((c) => (
                  <Select.Option key={c.id} value={c.id}>
                    {c.name} - {c.code}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="orderDate" label="Ngày" initialValue={dayjs()}>
              <DatePicker format="DD/MM/YYYY" />
            </Form.Item>
          </Space>

          {selectedCustomer && (
            <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 6 }}>
              <Space size="large">
                <Text>ĐT: {selectedCustomer.phone || '-'}</Text>
                <Text>Địa chỉ: {selectedCustomer.address || '-'}</Text>
                <Text>
                  Nhóm: {selectedCustomer.customerGroup?.name || 'Khách lẻ'}
                </Text>
              </Space>
            </div>
          )}
        </Form>
      </Card>

      <Card title="Danh sách sản phẩm" style={{ marginBottom: 16 }}>
        <Space style={{ marginBottom: 16 }}>
          <Select
            showSearch
            placeholder="Chọn sản phẩm để thêm"
            style={{ width: 400 }}
            optionFilterProp="children"
            onChange={handleAddProduct}
            value={null}
            loading={loading}
            filterOption={(input, option) =>
              option.children.toLowerCase().includes(input.toLowerCase())
            }
          >
            {products.map((p) => (
              <Select.Option key={p.id} value={p.id}>
                {p.sku} - {p.name}
              </Select.Option>
            ))}
          </Select>
        </Space>

        <Table
          dataSource={orderItems}
          columns={columns}
          rowKey="productId"
          pagination={false}
          size="small"
        />
      </Card>

      <Card title="Tổng cộng">
        <Form form={form} layout="vertical">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Tổng tiền hàng:</Text>
              <Text strong>{formatPrice(totals.subtotal)}</Text>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Chiết khấu:</Text>
              <Form.Item name="discount" noStyle initialValue={0}>
                <InputNumber
                  min={0}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\,/g, '')}
                  style={{ width: 150 }}
                  onChange={() => form.validateFields()}
                />
              </Form.Item>
            </div>

            <Divider style={{ margin: '8px 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text strong style={{ fontSize: 16 }}>Tổng thanh toán:</Text>
              <Text strong style={{ fontSize: 16, color: '#1890ff' }}>{formatPrice(totals.total)}</Text>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Thanh toán:</Text>
              <Form.Item name="paidAmount" noStyle initialValue={0}>
                <InputNumber
                  min={0}
                  max={totals.total}
                  formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(val) => val.replace(/\,/g, '')}
                  style={{ width: 150 }}
                  onChange={() => form.validateFields()}
                />
              </Form.Item>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <Text>Còn nợ:</Text>
              <Text style={{ color: totals.debtAmount > 0 ? 'red' : 'green' }}>
                {formatPrice(totals.debtAmount)}
              </Text>
            </div>

            <Form.Item name="note" label="Ghi chú">
              <Input.TextArea rows={2} />
            </Form.Item>
          </Space>
        </Form>
      </Card>
    </div>
  )
}

export default OrderCreate
