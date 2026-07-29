import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Form, Input, Button, message } from 'antd'
import {
  UserOutlined,
  LockOutlined,
  RightOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
  BarChartOutlined,
  CheckCircleFilled,
} from '@ant-design/icons'
import { authAPI } from '../services/api'
import { useAuthStore } from '../store'

const features = [
  { icon: <ShoppingCartOutlined />, text: 'Tạo đơn hàng, in hóa đơn nhanh chóng' },
  { icon: <WalletOutlined />, text: 'Theo dõi công nợ, thanh toán chính xác' },
  { icon: <BarChartOutlined />, text: 'Báo cáo doanh thu theo từng nhân viên' },
]

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
          <div className="login-brand">
            <span className="login-brand-mark">B</span>
            <div>
              <div className="login-brand-name">BuyNow</div>
              <div className="login-brand-sub">Hệ thống Quản lý Bán hàng</div>
            </div>
          </div>

          <h2 className="login-headline">
            Giải pháp bán hàng<br />toàn diện cho doanh nghiệp
          </h2>
          <p className="login-description">
            Quản lý đơn hàng, khách hàng, tồn kho và công nợ trên một nền tảng
            duy nhất — nhanh, chính xác và chuyên nghiệp.
          </p>

          <ul className="login-features">
            {features.map((f, i) => (
              <li key={i}>
                <span className="login-feature-icon">{f.icon}</span>
                <span>{f.text}</span>
                <CheckCircleFilled className="login-feature-check" />
              </li>
            ))}
          </ul>

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
          <div className="login-form-brand">
            <span className="login-brand-mark">B</span>
            <span className="login-form-brand-name">BuyNow</span>
          </div>

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
            requiredMark={false}
          >
            <Form.Item
              name="email"
              label="Email đăng nhập"
              rules={[
                { required: true, message: 'Vui lòng nhập email' },
                { type: 'email', message: 'Email không hợp lệ' },
              ]}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#98a4b3' }} />}
                placeholder="Nhập email"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label="Mật khẩu"
              rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#98a4b3' }} />}
                placeholder="Nhập mật khẩu"
                size="large"
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: 28 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                size="large"
                icon={<RightOutlined />}
                iconPosition="end"
              >
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>

          <p className="login-footer-note">
            © NPP Hùng Thư · Hệ thống quản lý bán hàng nội bộ
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
