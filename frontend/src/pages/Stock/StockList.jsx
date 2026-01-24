import { useEffect, useState } from 'react'
import { Table, Button, Input, Space, Modal, Form, InputNumber, Select, message, Typography, Tag, Card, Grid } from 'antd'
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined } from '@ant-design/icons'
import { stockAPI, productsAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid

const StockList = () => {
  const screens = useBreakpoint()
  const isMobile = !screens.md
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

  // Mobile Stock Card
  const StockCard = ({ item }) => {
    const isLowStock = item.stock <= item.minStock
    return (
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        actions={[
          <Button
            key="adjust"
            type="link"
            icon={<EditOutlined />}
            onClick={() => openAdjustModal(item)}
          >
            Điều chỉnh
          </Button>
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
              SKU: {item.sku} | {item.unit || '—'}
            </div>
          </div>
          <Tag color={isLowStock ? 'red' : 'green'}>
            {isLowStock ? 'Cần nhập' : 'Đủ hàng'}
          </Tag>
        </div>
        <div style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: isLowStock ? '#ffedeb' : '#dcf7e9',
          borderRadius: 8,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#788492' }}>Tồn kho</div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: isLowStock ? '#de350b' : '#22a06b'
            }}>
              {item.stock}
              {isLowStock && <WarningOutlined style={{ marginLeft: 6, color: '#faad14' }} />}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#788492' }}>Tối thiểu</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#5e6c7b' }}>
              {item.minStock}
            </div>
          </div>
        </div>
      </Card>
    )
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
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16
      }}>
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Tồn kho</Title>
        <Space style={{ width: isMobile ? '100%' : 'auto' }} direction={isMobile ? 'vertical' : 'horizontal'}>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 200 }}
            allowClear
          />
          <Space style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              type={showLowStock ? 'primary' : 'default'}
              icon={<WarningOutlined />}
              onClick={() => setShowLowStock(!showLowStock)}
              style={{ flex: isMobile ? 1 : 'unset' }}
            >
              {isMobile ? 'Cần nhập' : 'Sắp hết hàng'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setImportModalOpen(true)}
              style={{ flex: isMobile ? 1 : 'unset' }}
            >
              Nhập kho
            </Button>
          </Space>
        </Space>
      </div>

      {/* Content - Table or Cards */}
      {isMobile ? (
        <div>
          {loading ? (
            <Card loading={true} />
          ) : (
            <>
              {stock.map((item) => (
                <StockCard key={item.id} item={item} />
              ))}
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#888' }}>
                Hiển thị {stock.length} sản phẩm
              </div>
            </>
          )}
        </div>
      ) : (
        <Table
          dataSource={stock}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} sản phẩm` }}
        />
      )}

      {/* Import Modal */}
      <Modal
        title="Nhập kho"
        open={importModalOpen}
        onCancel={() => { setImportModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        width={isMobile ? '100%' : 520}
        style={isMobile ? { top: 20 } : undefined}
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
              optionFilterProp="label"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={products.map((p) => ({
                value: p.id,
                label: `${p.sku} - ${p.name}`,
              }))}
            />
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
        title={`Điều chỉnh: ${selectedProduct?.name}`}
        open={adjustModalOpen}
        onCancel={() => { setAdjustModalOpen(false); form.resetFields() }}
        onOk={() => form.submit()}
        width={isMobile ? '100%' : 520}
        style={isMobile ? { top: 20 } : undefined}
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
