import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Switch, Button, Typography, message, Grid } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { productsAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid

const ProductForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const isEdit = !!id

  useEffect(() => {
    if (isEdit) {
      loadProduct()
    }
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const res = await productsAPI.getById(id)
      form.setFieldsValue(res.data)
    } catch (error) {
      message.error('Lỗi tải thông tin sản phẩm')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      if (isEdit) {
        await productsAPI.update(id, values)
        message.success('Cập nhật sản phẩm thành công')
      } else {
        await productsAPI.create(values)
        message.success('Thêm sản phẩm thành công')
      }
      navigate('/products')
    } catch (error) {
      message.error(error.message || 'Lỗi xử lý')
    } finally {
      setSaving(false)
    }
  }

  const priceFormatter = (val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  const priceParser = (val) => val.replace(/\,/g, '')

  // Price Input Component for Mobile
  const PriceField = ({ name, label }) => (
    <Form.Item
      name={name}
      label={<span style={{ fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>{label}</span>}
      style={{ marginBottom: isMobile ? 12 : 16 }}
    >
      <InputNumber
        min={0}
        style={{ width: '100%', height: isMobile ? 48 : 40 }}
        formatter={priceFormatter}
        parser={priceParser}
        placeholder="0"
        controls={false}
        inputMode="numeric"
      />
    </Form.Item>
  )

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
            onClick={() => navigate('/products')}
            style={{ minWidth: 40, height: isMobile ? 40 : 32 }}
          />
          <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
            {isEdit ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
          </Title>
        </div>
      </div>

      <Card
        loading={loading}
        style={{
          maxWidth: isMobile ? '100%' : 700,
          border: isMobile ? 'none' : undefined,
          boxShadow: isMobile ? 'none' : undefined,
        }}
        bodyStyle={{ padding: isMobile ? '16px 0' : 24 }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            active: true,
            wholesalePrice: 0,
            mediumDealerPrice: 0,
            largeDealerPrice: 0,
            retailPrice: 0,
            minStock: 10,
          }}
          size={isMobile ? 'large' : 'middle'}
        >
          {/* Basic Info */}
          <div style={{
            background: isMobile ? '#f8f9fa' : 'transparent',
            padding: isMobile ? 16 : 0,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Title level={5} style={{ marginBottom: 16, fontSize: isMobile ? 15 : 16 }}>
              Thông tin cơ bản
            </Title>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? 0 : 16
            }}>
              <Form.Item
                name="sku"
                label={<span style={{ fontWeight: 500 }}>Mã SKU <span style={{ color: '#ff4d4f' }}>*</span></span>}
                rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}
              >
                <Input
                  placeholder="Nhập mã SKU"
                  style={{ height: isMobile ? 48 : 40 }}
                />
              </Form.Item>

              <Form.Item
                name="unit"
                label={<span style={{ fontWeight: 500 }}>Đơn vị tính</span>}
              >
                <Input
                  placeholder="VD: gói, chai, thùng..."
                  style={{ height: isMobile ? 48 : 40 }}
                />
              </Form.Item>
            </div>

            <Form.Item
              name="name"
              label={<span style={{ fontWeight: 500 }}>Tên sản phẩm <span style={{ color: '#ff4d4f' }}>*</span></span>}
              rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
            >
              <Input
                placeholder="Nhập tên sản phẩm"
                style={{ height: isMobile ? 48 : 40 }}
              />
            </Form.Item>
          </div>

          {/* Prices */}
          <div style={{
            background: isMobile ? '#f0f7ff' : 'transparent',
            padding: isMobile ? 16 : 0,
            borderRadius: 12,
            marginBottom: 16,
          }}>
            <Title level={5} style={{ marginBottom: 16, fontSize: isMobile ? 15 : 16 }}>
              Bảng giá
            </Title>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)',
              gap: isMobile ? 12 : 16
            }}>
              <PriceField name="wholesalePrice" label="Giá bán buôn" />
              <PriceField name="mediumDealerPrice" label="Giá ĐL vừa" />
              <PriceField name="largeDealerPrice" label="Giá ĐL lớn" />
              <PriceField name="retailPrice" label="Giá bán lẻ" />
            </div>
          </div>

          {/* Stock Settings */}
          <div style={{
            background: isMobile ? '#f6ffed' : 'transparent',
            padding: isMobile ? 16 : 0,
            borderRadius: 12,
          }}>
            <Title level={5} style={{ marginBottom: 16, fontSize: isMobile ? 15 : 16 }}>
              Tồn kho & Trạng thái
            </Title>

            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr',
              gap: isMobile ? 12 : 16,
              alignItems: 'end'
            }}>
              <Form.Item
                name="minStock"
                label={<span style={{ fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>Tồn tối thiểu</span>}
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%', height: isMobile ? 48 : 40 }}
                  inputMode="numeric"
                  controls={false}
                />
              </Form.Item>

              <Form.Item
                name="active"
                label={<span style={{ fontWeight: 500, fontSize: isMobile ? 13 : 14 }}>Trạng thái</span>}
                valuePropName="checked"
              >
                <Switch
                  checkedChildren="Hoạt động"
                  unCheckedChildren="Ngừng"
                  style={{ marginTop: isMobile ? 8 : 0 }}
                />
              </Form.Item>
            </div>
          </div>
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
            onClick={() => navigate('/products')}
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
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
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
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
          <Button onClick={() => navigate('/products')}>
            Hủy
          </Button>
        </div>
      )}
    </div>
  )
}

export default ProductForm
