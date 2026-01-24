import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Switch, Button, Typography, message, Grid, Tag } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons'
import { usersAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid

const roleOptions = [
  { value: 'ADMIN', label: 'Quản trị viên', color: '#f5222d' },
  { value: 'MANAGER', label: 'Quản lý', color: '#1890ff' },
  { value: 'SALES', label: 'Nhân viên', color: '#52c41a' },
]

const UserForm = () => {
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
      loadUser()
    } else {
      form.setFieldsValue({ role: 'SALES', active: true })
    }
  }, [id])

  const loadUser = async () => {
    setLoading(true)
    try {
      const res = await usersAPI.getById(id)
      form.setFieldsValue({
        name: res.data.name,
        email: res.data.email,
        phone: res.data.phone,
        role: res.data.role,
        active: res.data.active,
      })
    } catch (error) {
      message.error('Lỗi tải thông tin tài khoản')
      navigate('/users')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      if (isEdit) {
        const updateData = { ...values }
        if (!updateData.password) {
          delete updateData.password
        }
        await usersAPI.update(id, updateData)
        message.success('Cập nhật tài khoản thành công')
      } else {
        await usersAPI.create(values)
        message.success('Tạo tài khoản thành công')
      }
      navigate('/users')
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
            onClick={() => navigate('/users')}
            style={{ minWidth: 40, height: isMobile ? 40 : 32 }}
          />
          <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
            {isEdit ? 'Sửa tài khoản' : 'Thêm tài khoản'}
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
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          size={isMobile ? 'large' : 'middle'}
        >
          <Form.Item
            name="name"
            label={<span style={{ fontWeight: 500 }}>Họ tên <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Nhập họ tên"
              style={{ height: isMobile ? 48 : 40 }}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label={<span style={{ fontWeight: 500 }}>Email <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input
              prefix={<MailOutlined style={{ color: '#bfbfbf' }} />}
              placeholder="Nhập email"
              style={{ height: isMobile ? 48 : 40 }}
              inputMode="email"
              autoCapitalize="off"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={
              <span style={{ fontWeight: 500 }}>
                {isEdit ? 'Mật khẩu mới' : 'Mật khẩu'}
                {!isEdit && <span style={{ color: '#ff4d4f' }}> *</span>}
              </span>
            }
            rules={isEdit ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            extra={isEdit && <span style={{ fontSize: 12, color: '#888' }}>Để trống nếu không đổi mật khẩu</span>}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#bfbfbf' }} />}
              placeholder={isEdit ? 'Nhập mật khẩu mới' : 'Nhập mật khẩu'}
              style={{ height: isMobile ? 48 : 40 }}
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
            name="role"
            label={<span style={{ fontWeight: 500 }}>Vai trò <span style={{ color: '#ff4d4f' }}>*</span></span>}
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              placeholder="Chọn vai trò"
              style={{ height: isMobile ? 48 : 40 }}
              dropdownStyle={{ padding: 8 }}
            >
              {roleOptions.map(role => (
                <Select.Option key={role.value} value={role.value}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <div style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: role.color,
                    }} />
                    <span>{role.label}</span>
                  </div>
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="active"
            label={<span style={{ fontWeight: 500 }}>Trạng thái</span>}
            valuePropName="checked"
          >
            <Switch
              checkedChildren="Hoạt động"
              unCheckedChildren="Khóa"
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
            onClick={() => navigate('/users')}
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
          <Button onClick={() => navigate('/users')}>
            Hủy
          </Button>
        </div>
      )}
    </div>
  )
}

export default UserForm
