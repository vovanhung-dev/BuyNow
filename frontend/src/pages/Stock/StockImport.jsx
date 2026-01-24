import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Select, Button, Typography, message, Grid } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, InboxOutlined } from '@ant-design/icons'
import { stockAPI, productsAPI } from '../../services/api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const { TextArea } = Input

const StockImport = () => {
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)

  useEffect(() => {
    loadProducts()
  }, [])

  const loadProducts = async () => {
    try {
      const res = await productsAPI.getAll({ limit: 1000, active: 'true' })
      setProducts(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const handleProductChange = (productId) => {
    const product = products.find(p => p.id === productId)
    setSelectedProduct(product)
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await stockAPI.import(values)
      message.success('Nhập kho thành công')
      navigate('/stock')
    } catch (error) {
      message.error(error.message || 'Lỗi nhập kho')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in" style={{
      paddingBottom: isMobile ? 100 : 24,
      minHeight: isMobile ? '100vh' : 'auto'
    }}>
      {/* Header - Sticky on mobile */}
      <div style={{
        position: isMobile ? 'sticky' : 'relative',
        top: isMobile ? 0 : 'auto',
        zIndex: 10,
        background: '#fff',
        padding: isMobile ? '12px 0' : '0 0 16px 0',
        marginBottom: isMobile ? 0 : 16,
        borderBottom: isMobile ? '1px solid #f0f0f0' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/stock')}
            style={{ minWidth: 40, height: isMobile ? 40 : 32 }}
          />
          <div>
            <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
              Nhập kho
            </Title>
          </div>
        </div>
      </div>

      <Card
        style={{
          maxWidth: isMobile ? '100%' : 500,
          border: isMobile ? 'none' : undefined,
          boxShadow: isMobile ? 'none' : undefined,
        }}
        bodyStyle={{ padding: isMobile ? '16px 0' : 24 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size={isMobile ? 'large' : 'middle'}
        >
          <Form.Item
            name="productId"
            label={<span style={{ fontWeight: 500 }}>Chọn sản phẩm <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
          >
            <Select
              showSearch
              placeholder="Tìm và chọn sản phẩm"
              optionFilterProp="label"
              style={{ height: isMobile ? 48 : 40 }}
              dropdownStyle={{ maxHeight: 300 }}
              onChange={handleProductChange}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={products.map((p) => ({
                value: p.id,
                label: `${p.sku} - ${p.name}`,
              }))}
            />
          </Form.Item>

          {/* Selected Product Info */}
          {selectedProduct && (
            <div style={{
              background: '#f0f7ff',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <Text style={{ fontSize: 13, color: '#788492' }}>Tồn kho hiện tại</Text>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: selectedProduct.stock <= selectedProduct.minStock ? '#de350b' : '#22a06b'
                  }}>
                    {selectedProduct.stock}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Text style={{ fontSize: 13, color: '#788492' }}>Tồn tối thiểu</Text>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{selectedProduct.minStock}</div>
                </div>
              </div>
            </div>
          )}

          <Form.Item
            name="quantity"
            label={<span style={{ fontWeight: 500 }}>Số lượng nhập <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber
              min={1}
              style={{ width: '100%', height: isMobile ? 56 : 40 }}
              placeholder="Nhập số lượng"
              inputMode="numeric"
              controls={false}
            />
          </Form.Item>

          <Form.Item
            name="note"
            label={<span style={{ fontWeight: 500 }}>Ghi chú</span>}
          >
            <TextArea
              rows={isMobile ? 3 : 2}
              placeholder="Ghi chú (tùy chọn)"
              style={{ fontSize: isMobile ? 16 : 14 }}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* Fixed Footer on Mobile */}
      {isMobile ? (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: 12,
          zIndex: 100,
        }}>
          <Button
            onClick={() => navigate('/stock')}
            style={{ flex: 1, height: 48 }}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            icon={<InboxOutlined />}
            loading={saving}
            onClick={() => form.submit()}
            style={{ flex: 2, height: 48 }}
          >
            Nhập kho
          </Button>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Button
            type="primary"
            icon={<InboxOutlined />}
            loading={saving}
            onClick={() => form.submit()}
          >
            Nhập kho
          </Button>
          <Button onClick={() => navigate('/stock')}>
            Hủy
          </Button>
        </div>
      )}
    </div>
  )
}

export default StockImport
