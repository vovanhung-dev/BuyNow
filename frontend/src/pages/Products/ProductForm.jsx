import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, InputNumber, Switch, Button, Space, Typography, message, Grid, Row, Col } from 'antd'
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons'
import { productsAPI } from '../../services/api'

const { Title, Text } = Typography
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

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/products')} />
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>
          {isEdit ? 'Cập nhật sản phẩm' : 'Thêm sản phẩm mới'}
        </Title>
      </div>

      <Card loading={loading} style={{ maxWidth: 900 }}>
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
        >
          {/* Basic Info */}
          <Title level={5} style={{ marginBottom: 16 }}>Thông tin cơ bản</Title>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="sku"
                label="Mã SKU"
                rules={[{ required: true, message: 'Vui lòng nhập mã SKU' }]}
              >
                <Input
                  placeholder="Nhập mã SKU"
                  size={isMobile ? 'large' : 'middle'}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name="unit"
                label="Đơn vị tính"
              >
                <Input
                  placeholder="VD: gói, chai, thùng..."
                  size={isMobile ? 'large' : 'middle'}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Tên sản phẩm"
            rules={[{ required: true, message: 'Vui lòng nhập tên sản phẩm' }]}
          >
            <Input
              placeholder="Nhập tên sản phẩm"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          {/* Prices */}
          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Bảng giá</Title>

          <Row gutter={16}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="wholesalePrice"
                label="Giá bán buôn"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={priceFormatter}
                  parser={priceParser}
                  size={isMobile ? 'large' : 'middle'}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="mediumDealerPrice"
                label="Giá ĐL vừa"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={priceFormatter}
                  parser={priceParser}
                  size={isMobile ? 'large' : 'middle'}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="largeDealerPrice"
                label="Giá ĐL lớn"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={priceFormatter}
                  parser={priceParser}
                  size={isMobile ? 'large' : 'middle'}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item
                name="retailPrice"
                label="Giá bán lẻ"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  formatter={priceFormatter}
                  parser={priceParser}
                  size={isMobile ? 'large' : 'middle'}
                  addonAfter="đ"
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Stock Settings */}
          <Title level={5} style={{ marginTop: 24, marginBottom: 16 }}>Tồn kho</Title>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="minStock"
                label="Tồn kho tối thiểu"
              >
                <InputNumber
                  min={0}
                  style={{ width: '100%' }}
                  size={isMobile ? 'large' : 'middle'}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="active"
                label="Trạng thái"
                valuePropName="checked"
              >
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Ngừng bán" />
              </Form.Item>
            </Col>
          </Row>

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
              {isEdit ? 'Cập nhật' : 'Thêm mới'}
            </Button>
            <Button
              onClick={() => navigate('/products')}
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

export default ProductForm
