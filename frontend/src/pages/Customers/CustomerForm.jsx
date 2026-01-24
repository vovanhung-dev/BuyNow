import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Typography, message, Grid } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { customersAPI, customerGroupsAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid
const { TextArea } = Input

const CustomerForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerGroups, setCustomerGroups] = useState([])
  const isEdit = !!id

  useEffect(() => {
    loadCustomerGroups()
    if (isEdit) {
      loadCustomer()
    }
  }, [id])

  const loadCustomerGroups = async () => {
    try {
      const res = await customerGroupsAPI.getAll()
      setCustomerGroups(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const loadCustomer = async () => {
    setLoading(true)
    try {
      const res = await customersAPI.getById(id)
      form.setFieldsValue(res.data)
    } catch (error) {
      message.error('Lỗi tải thông tin khách hàng')
      navigate('/customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      if (isEdit) {
        await customersAPI.update(id, values)
        message.success('Cập nhật khách hàng thành công')
      } else {
        await customersAPI.create(values)
        message.success('Thêm khách hàng thành công')
      }
      navigate('/customers')
    } catch (error) {
      message.error(error.message || 'Lỗi xử lý')
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
            onClick={() => navigate('/customers')}
            size={isMobile ? 'middle' : 'middle'}
            style={{
              minWidth: 40,
              height: isMobile ? 40 : 32,
            }}
          />
          <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
            {isEdit ? 'Sửa khách hàng' : 'Thêm khách hàng'}
          </Title>
        </div>
      </div>

      <Card
        loading={loading}
        style={{
          maxWidth: isMobile ? '100%' : 600,
          border: isMobile ? 'none' : undefined,
          boxShadow: isMobile ? 'none' : undefined,
        }}
        bodyStyle={{
          padding: isMobile ? '16px 0' : 24,
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ customerGroupId: null }}
          size={isMobile ? 'large' : 'middle'}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 500 }}>Tên khách hàng <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Nhập tên khách hàng"
              style={{ height: isMobile ? 48 : 40 }}
            />
          </Form.Item>

          <Form.Item
            name="code"
            label={<span style={{ fontWeight: 500 }}>Mã khách hàng</span>}
          >
            <Input
              placeholder="Mã tự động nếu để trống"
              style={{ height: isMobile ? 48 : 40 }}
            />
          </Form.Item>

          <Form.Item
            name="customerGroupId"
            label={<span style={{ fontWeight: 500 }}>Nhóm khách hàng</span>}
          >
            <Select
              placeholder="Chọn nhóm khách hàng"
              allowClear
              style={{ height: isMobile ? 48 : 40 }}
              dropdownStyle={{ maxHeight: 300 }}
              options={customerGroups.map((g) => ({
                value: g.id,
                label: g.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label={<span style={{ fontWeight: 500 }}>Số điện thoại</span>}
          >
            <Input
              prefix={<PhoneOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Nhập số điện thoại"
              style={{ height: isMobile ? 48 : 40 }}
              inputMode="tel"
            />
          </Form.Item>

          <Form.Item
            name="address"
            label={<span style={{ fontWeight: 500 }}>Địa chỉ</span>}
          >
            <TextArea
              placeholder="Nhập địa chỉ chi tiết"
              rows={isMobile ? 3 : 2}
              style={{ fontSize: isMobile ? 16 : 14 }}
            />
          </Form.Item>

          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? 0 : 16
          }}>
            <Form.Item
              name="district"
              label={<span style={{ fontWeight: 500 }}>Quận/Huyện</span>}
            >
              <Input
                prefix={<EnvironmentOutlined style={{ color: '#bfbfbf' }} />}
                placeholder="Nhập quận/huyện"
                style={{ height: isMobile ? 48 : 40 }}
              />
            </Form.Item>

            <Form.Item
              name="ward"
              label={<span style={{ fontWeight: 500 }}>Phường/Xã</span>}
            >
              <Input
                placeholder="Nhập phường/xã"
                style={{ height: isMobile ? 48 : 40 }}
              />
            </Form.Item>
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
            onClick={() => navigate('/customers')}
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
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={() => form.submit()}
          >
            {isEdit ? 'Cập nhật' : 'Thêm mới'}
          </Button>
          <Button onClick={() => navigate('/customers')}>
            Hủy
          </Button>
        </div>
      )}
    </div>
  )
}

export default CustomerForm
