import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import { UserOutlined, LockOutlined, RightOutlined } from '@ant-design/icons'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store'

const Login = () => {
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const onFinish = async (values) => {
    setLoading(true)
    try {
      const res = await authAPI.login(values)
      if (res.success) {
        login(res.data.user, res.data.token)
        message.success('Đăng nhập thành công!')
        navigate('/')
      }
    } catch (error) {
      message.error(error.message || 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-container">
      {/* Left Panel - Branding */}
      <div className="login-left">
        <div className="login-left-content">
          <div className="login-logo">BuyNow</div>
          <div className="login-logo-underline" />
          <p className="login-tagline">Hệ thống Quản lý Bán hàng</p>
          <p className="login-description">
            Giải pháp toàn diện cho doanh nghiệp của bạn.
            Quản lý đơn hàng, khách hàng, tồn kho và báo cáo doanh thu
            một cách chuyên nghiệp và hiệu quả.
          </p>

          <div className="login-company">
            <p className="login-company-name">NPP HÙNG THƯ</p>
            <p className="login-company-contact">
              0865.888.128 - 09.1234.1256<br />
              Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="login-right">
        <div className="login-form-wrapper">
          <h1 className="login-form-title">Chào mừng trở lại</h1>
          <p className="login-form-subtitle">
            Đăng nhập để tiếp tục sử dụng hệ thống
          </p>

          <Form
            name="login"
            onFinish={onFinish}
            autoComplete="off"
            layout="vertical"
            className="login-form"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#98a4b3' }} />}
                placeholder="Email đăng nhập"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#98a4b3' }} />}
                placeholder="Mật khẩu"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                icon={<RightOutlined />}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row-reverse',
                  gap: 8,
                }}
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  )
}

export default Login
