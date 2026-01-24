import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Button, Typography, message, Grid } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, WarningOutlined } from '@ant-design/icons'
import { stockAPI } from '../../services/api'

const { Title, Text } = Typography
const { useBreakpoint } = Grid
const { TextArea } = Input

const StockAdjust = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const res = await stockAPI.getStock({ search: '' })
      const found = res.data?.find(p => p.id === id)
      if (found) {
        setProduct(found)
        form.setFieldsValue({ newQuantity: found.stock })
      } else {
        message.error('Không tìm thấy sản phẩm')
        navigate('/stock')
      }
    } catch (error) {
      message.error('Lỗi tải thông tin')
      navigate('/stock')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      await stockAPI.adjust({
        productId: id,
        newQuantity: values.newQuantity,
        note: values.note,
      })
      message.success('Điều chỉnh tồn kho thành công')
      navigate('/stock')
    } catch (error) {
      message.error(error.message || 'Lỗi điều chỉnh')
    } finally {
      setSaving(false)
    }
  }

  const isLowStock = product && product.stock <= product.minStock

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
          <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
            Điều chỉnh tồn kho
          </Title>
        </div>
      </div>

      <Card
        loading={loading}
        style={{
          maxWidth: isMobile ? '100%' : 500,
          border: isMobile ? 'none' : undefined,
          boxShadow: isMobile ? 'none' : undefined,
        }}
        bodyStyle={{ padding: isMobile ? '16px 0' : 24 }}
      >
        {product && (
          <>
            {/* Product Info Card */}
            <div style={{
              background: '#f8f9fa',
              padding: 16,
              borderRadius: 12,
              marginBottom: 20,
            }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
                {product.name}
              </div>
              <div style={{ fontSize: 13, color: '#788492' }}>
                SKU: {product.sku} | ĐVT: {product.unit || '—'}
              </div>
            </div>

            {/* Current Stock Display */}
            <div style={{
              display: 'flex',
              gap: 12,
              marginBottom: 24,
            }}>
              <div style={{
                flex: 1,
                padding: 16,
                background: isLowStock ? '#ffedeb' : '#dcf7e9',
                borderRadius: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>Tồn hiện tại</div>
                <div style={{
                  fontSize: 32,
                  fontWeight: 700,
                  color: isLowStock ? '#de350b' : '#22a06b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}>
                  {product.stock}
                  {isLowStock && <WarningOutlined style={{ fontSize: 20 }} />}
                </div>
              </div>
              <div style={{
                flex: 1,
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 12,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>Tồn tối thiểu</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#5e6c7b' }}>
                  {product.minStock}
                </div>
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              size={isMobile ? 'large' : 'middle'}
            >
              <Form.Item
                name="newQuantity"
                label={<span style={{ fontWeight: 500, fontSize: 15 }}>Tồn kho mới <span style={{ color: '#ff4d4f' }}>*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
              >
                <InputNumber
                  min={0}
                  style={{
                    width: '100%',
                    height: isMobile ? 56 : 40,
                  }}
                  placeholder="Nhập số lượng mới"
                  inputMode="numeric"
                  controls={false}
                />
              </Form.Item>

              <Form.Item
                name="note"
                label={<span style={{ fontWeight: 500 }}>Lý do điều chỉnh</span>}
              >
                <TextArea
                  rows={isMobile ? 3 : 2}
                  placeholder="VD: Kiểm kê kho, hàng hư hỏng, sai số..."
                  style={{ fontSize: isMobile ? 16 : 14 }}
                />
              </Form.Item>
            </Form>
          </>
        )}
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
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
            style={{ flex: 2, height: 48 }}
          >
            Điều chỉnh
          </Button>
        </div>
      ) : (
        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
          >
            Điều chỉnh
          </Button>
          <Button onClick={() => navigate('/stock')}>
            Hủy
          </Button>
        </div>
      )}
    </div>
  )
}

export default StockAdjust
