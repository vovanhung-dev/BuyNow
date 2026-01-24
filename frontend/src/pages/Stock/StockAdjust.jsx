import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Button, Typography, message, Grid, Tag } from 'antd'
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
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/stock')} />
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>
          Điều chỉnh tồn kho
        </Title>
      </div>

      <Card loading={loading} style={{ maxWidth: 600 }}>
        {product && (
          <>
            {/* Product Info */}
            <div style={{
              padding: 16,
              background: '#f5f7fa',
              borderRadius: 8,
              marginBottom: 24
            }}>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
                {product.name}
              </div>
              <div style={{ fontSize: 13, color: '#788492', marginBottom: 12 }}>
                SKU: {product.sku} | ĐVT: {product.unit || '—'}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 16px',
                background: isLowStock ? '#ffedeb' : '#dcf7e9',
                borderRadius: 8
              }}>
                <div>
                  <div style={{ fontSize: 12, color: '#788492' }}>Tồn kho hiện tại</div>
                  <div style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: isLowStock ? '#de350b' : '#22a06b'
                  }}>
                    {product.stock}
                    {isLowStock && <WarningOutlined style={{ marginLeft: 8, fontSize: 18 }} />}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#788492' }}>Tối thiểu</div>
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{product.minStock}</div>
                </div>
              </div>
            </div>

            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
            >
              <Form.Item
                name="newQuantity"
                label="Tồn kho mới"
                rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  size={isMobile ? 'large' : 'middle'}
                  placeholder="Nhập số lượng mới"
                />
              </Form.Item>

              <Form.Item
                name="note"
                label="Lý do điều chỉnh"
              >
                <TextArea
                  rows={3}
                  placeholder="VD: Kiểm kê kho, hàng hư hỏng..."
                />
              </Form.Item>

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: 12,
                marginTop: 24,
                flexDirection: isMobile ? 'column' : 'row'
              }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={saving}
                  size={isMobile ? 'large' : 'middle'}
                  style={{ flex: isMobile ? 'unset' : 1, maxWidth: isMobile ? '100%' : 200 }}
                >
                  Điều chỉnh
                </Button>
                <Button
                  onClick={() => navigate('/stock')}
                  size={isMobile ? 'large' : 'middle'}
                >
                  Hủy
                </Button>
              </div>
            </Form>
          </>
        )}
      </Card>
    </div>
  )
}

export default StockAdjust
