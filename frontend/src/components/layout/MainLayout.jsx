import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Avatar, Space, Badge } from 'antd'
import {
  DashboardOutlined,
  UserOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  DatabaseOutlined,
  DollarOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store'

const { Header, Sider, Content } = Layout

const menuItems = [
  {
    key: '/',
    icon: <DashboardOutlined />,
    label: 'Tổng quan',
  },
  {
    key: '/customers',
    icon: <UserOutlined />,
    label: 'Khách hàng',
  },
  {
    key: '/products',
    icon: <ShoppingOutlined />,
    label: 'Sản phẩm',
  },
  {
    key: '/orders',
    icon: <ShoppingCartOutlined />,
    label: 'Đơn hàng',
  },
  {
    key: '/stock',
    icon: <DatabaseOutlined />,
    label: 'Tồn kho',
  },
  {
    key: '/payments',
    icon: <DollarOutlined />,
    label: 'Thanh toán',
  },
]

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleMenuClick = ({ key }) => {
    navigate(key)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getRoleLabel = (role) => {
    const roles = {
      ADMIN: 'Quản trị viên',
      MANAGER: 'Quản lý',
      SALES: 'Nhân viên',
    }
    return roles[role] || role
  }

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: (
          <div style={{ padding: '8px 0' }}>
            <div style={{ fontWeight: 600, color: '#134e52' }}>{user?.name || 'User'}</div>
            <div style={{ fontSize: 12, color: '#788492' }}>{user?.email}</div>
          </div>
        ),
        disabled: true,
      },
      {
        key: 'role',
        label: (
          <span style={{
            display: 'inline-block',
            padding: '4px 12px',
            background: '#eef9fa',
            borderRadius: '12px',
            fontSize: 12,
            color: '#2a9299',
            fontWeight: 500,
          }}>
            {getRoleLabel(user?.role)}
          </span>
        ),
        disabled: true,
      },
      { type: 'divider' },
      {
        key: 'settings',
        label: 'Cài đặt',
        icon: <SettingOutlined />,
      },
      { type: 'divider' },
      {
        key: 'logout',
        label: 'Đăng xuất',
        icon: <LogoutOutlined />,
        danger: true,
      },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') handleLogout()
    },
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        collapsedWidth={72}
      >
        {/* Logo */}
        <div className="logo">
          {collapsed ? (
            <span className="logo-collapsed">BN</span>
          ) : (
            <span className="logo-text">BuyNow</span>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
        />

        {/* User Info at bottom when collapsed */}
        {collapsed && (
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            right: 0,
            textAlign: 'center',
          }}>
            <Dropdown menu={userMenu} placement="topRight" trigger={['click']}>
              <Avatar
                className="user-avatar"
                icon={<UserOutlined />}
                size={40}
                style={{ cursor: 'pointer' }}
              />
            </Dropdown>
          </div>
        )}
      </Sider>

      <Layout>
        {/* Header */}
        <Header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div
              className="header-toggle"
              onClick={() => setCollapsed(!collapsed)}
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </div>

            {/* Breadcrumb or page info could go here */}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* Notifications */}
            <Badge count={0} size="small">
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  cursor: 'pointer',
                  transition: 'all 150ms ease',
                  color: '#5e6c7b',
                }}
                className="header-toggle"
              >
                <BellOutlined style={{ fontSize: 18 }} />
              </div>
            </Badge>

            {/* User Dropdown */}
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div className="user-dropdown">
                <Avatar
                  className="user-avatar"
                  icon={<UserOutlined />}
                  size={36}
                />
                <span className="user-name">{user?.name}</span>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Main Content */}
        <Content className="main-content">
          <div className="content-card animate-fade-in">
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout
