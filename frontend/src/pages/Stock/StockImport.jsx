import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Select, Button, Typography, message, Grid } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { stockAPI, productsAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid
const { TextArea } = Input

const StockImport = () => {
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [products, setProducts] = useState([])
  const [saving, setSaving] = useState(false)

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
          Nhập kho
        </Title>
      </div>

      <Card style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="productId"
            label="Sản phẩm"
            rules={[{ required: true, message: 'Vui lòng chọn sản phẩm' }]}
          >
            <Select
              showSearch
              placeholder="Chọn sản phẩm"
              optionFilterProp="label"
              size={isMobile ? 'large' : 'middle'}
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
            <InputNumber
              min={1}
              style={{ width: '100%' }}
              size={isMobile ? 'large' : 'middle'}
              placeholder="Nhập số lượng"
            />
          </Form.Item>

          <Form.Item
            name="note"
            label="Ghi chú"
          >
            <TextArea
              rows={3}
              placeholder="Ghi chú (tùy chọn)"
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
              Nhập kho
            </Button>
            <Button
              onClick={() => navigate('/stock')}
              size={isMobile ? 'large' : 'middle'}
            >
              Hủy
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default StockImport
