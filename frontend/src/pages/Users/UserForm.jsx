import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Switch, Button, Typography, message, Grid, Tag } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, UserOutlined, MailOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons'
import { usersAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid

const roleConfig = {
  ADMIN: { color: '#f5222d', label: 'Quản trị viên' },
  MANAGER: { color: '#1890ff', label: 'Quản lý' },
  SALES: { color: '#52c41a', label: 'Nhân viên' },
}

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
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/users')} />
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>
          {isEdit ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
        </Title>
      </div>

      <Card loading={loading} style={{ maxWidth: 600 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="name"
            label="Họ tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập họ tên"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input
              prefix={<MailOutlined />}
              placeholder="Nhập email"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={isEdit ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            rules={isEdit ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Nhập mật khẩu"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Nhập số điện thoại"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select
              placeholder="Chọn vai trò"
              size={isMobile ? 'large' : 'middle'}
            >
              <Select.Option value="ADMIN">
                <Tag color="#f5222d">Quản trị viên</Tag>
              </Select.Option>
              <Select.Option value="MANAGER">
                <Tag color="#1890ff">Quản lý</Tag>
              </Select.Option>
              <Select.Option value="SALES">
                <Tag color="#52c41a">Nhân viên</Tag>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="active"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
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
              {isEdit ? 'Cập nhật' : 'Thêm mới'}
            </Button>
            <Button
              onClick={() => navigate('/users')}
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

export default UserForm
