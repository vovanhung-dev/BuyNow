import { useEffect, useState } from 'react'
import { Table, Button, Input, Space, Modal, Form, InputNumber, Select, message, Typography, Tag } from 'antd'
import { SearchOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons'
import { stockAPI, productsAPI } from '../../services/api'

const { Title } = Typography

const StockList = () => {
  const [stock, setStock] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadStock()
    loadProducts()
  }, [search, showLowStock])

  const loadStock = async () => {
    setLoading(true)
    try {
      const res = await stockAPI.getStock({ search, lowStock: showLowStock ? 'true' : undefined })
      setStock(res.data || [])
    } catch (error) {
      message.error('Lỗi tải tồn kho')
    } finally {
      setLoading(false)
    }
  }

  const loadProducts = async () => {
    try {
      const res = await productsAPI.getAll({ limit: 1000, active: 'true' })
      setProducts(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleImport = async (values) => {
    try {
      await stockAPI.import(values)
      message.success('Nhập kho thành công')
      setImportModalOpen(false)
      form.resetFields()
      loadStock()
    } catch (error) {
      message.error(error.message || 'Lỗi nhập kho')
    }
  }

  const handleAdjust = async (values) => {
    try {
      await stockAPI.adjust({
        productId: selectedProduct.id,
        newQuantity: values.newQuantity,
        note: values.note,
      })
      message.success('Điều chỉnh tồn kho thành công')
      setAdjustModalOpen(false)
      form.resetFields()
      loadStock()
    } catch (error) {
      message.error(error.message || 'Lỗi điều chỉnh')
    }
  }

  const openAdjustModal = (record) => {
    setSelectedProduct(record)
    form.setFieldsValue({ newQuantity: record.stock })
    setAdjustModalOpen(true)
  }

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (val, record) => (
        <Space>
          <span style={{
            color: val <= record.minStock ? 'red' : 'inherit',
            fontWeight: val <= record.minStock ? 'bold' : 'normal'
          }}>
            {val}
          </span>
          {val <= record.minStock && <WarningOutlined style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    { title: 'Tối thiểu', dataIndex: 'minStock', key: 'minStock', width: 100 },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => (
        record.stock <= record.minStock
          ? <Tag color="red">Cần nhập thêm</Tag>
          : <Tag color="green">Đủ hàng</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button size="small" onClick={() => openAdjustModal(record)}>
          Điều chỉnh
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Tồn kho</Title>
        <Space>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 200 }}
            allowClear
          />
          <Button
            type={showLowStock ? 'primary' : 'default'}
            icon={<WarningOutlined />}
            onClick={() => setShowLowStock(!showLowStock)}
          >
            Sắp hết hàng
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setImportModalOpen(true)}>
            Nhập kho
          </Button>
        </Space>
      </div>

      <Table
        dataSource={stock}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} sản phẩm` }}
      />

      {/* Import Modal */}
      <Modal
        title="Nhập kho"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleImport}>
          <Form.Item
            name="productId"
            label="Sản phẩm"
            rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
          >
            <Select
              showSearch
              placeholder="Chọn sản phẩm"
              optionFilterProp="children"
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
          </Form.Item>
          <Form.Item
            name="quantity"
            label="Số lượng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Adjust Modal */}
      <Modal
        title={`Điều chỉnh tồn kho: ${selectedProduct?.name}`}
        open={adjustModalOpen}
        onCancel={() => { setAdjustModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleAdjust}>
          <div style={{ marginBottom: 16 }}>
            <p>Tồn kho hiện tại: <strong>{selectedProduct?.stock}</strong></p>
          </div>
          <Form.Item
            name="newQuantity"
            label="Tồn kho mới"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="note" label="Lý do điều chỉnh">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default StockList
