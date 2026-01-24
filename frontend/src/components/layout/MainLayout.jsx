import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Avatar, Badge, Drawer, Grid } from 'antd'
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
  CloseOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store'

const { Header, Sider, Content } = Layout
const { useBreakpoint } = Grid

const getMenuItems = (userRole) => {
  const baseItems = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/customers', icon: <UserOutlined />, label: 'Khách hàng' },
    { key: '/products', icon: <ShoppingOutlined />, label: 'Sản phẩm' },
    { key: '/orders', icon: <ShoppingCartOutlined />, label: 'Đơn hàng' },
    { key: '/stock', icon: <DatabaseOutlined />, label: 'Tồn kho' },
    { key: '/payments', icon: <DollarOutlined />, label: 'Thanh toán' },
  ]

  // Only show user management for ADMIN
  if (userRole === 'ADMIN') {
    baseItems.push({ key: '/users', icon: <TeamOutlined />, label: 'Tài khoản' })
  }

  return baseItems
}

const MainLayout = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const screens = useBreakpoint()

  const isMobile = !screens.md
  const menuItems = getMenuItems(user?.role)

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Auto collapse on tablet
  useEffect(() => {
    if (screens.md && !screens.lg) {
      setCollapsed(true)
    } else if (screens.lg) {
      setCollapsed(false)
    }
  }, [screens])

  const handleMenuClick = ({ key }) => {
    navigate(key)
    if (isMobile) setMobileMenuOpen(false)
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
      { key: 'logout', label: 'Đăng xuất', icon: <LogoutOutlined />, danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'logout') handleLogout()
    },
  }

  // Sidebar content - reused for both desktop and mobile
  const SidebarContent = () => (
    <>
      <div className="logo">
        {(collapsed && !isMobile) ? (
          <span className="logo-collapsed">BN</span>
        ) : (
          <span className="logo-text">BuyNow</span>
        )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          width={240}
          collapsedWidth={72}
        >
          <SidebarContent />
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
      )}

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        width={280}
        styles={{
          body: { padding: 0, background: 'linear-gradient(180deg, #0d3b3e 0%, #134e52 100%)' },
          header: { display: 'none' },
        }}
        className="mobile-drawer"
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}>
          <span className="logo-text" style={{ margin: 0 }}>BuyNow</span>
          <CloseOutlined
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: '#fff', fontSize: 18, cursor: 'pointer' }}
          />
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{ background: 'transparent', borderRight: 0 }}
        />
        {/* User info at bottom */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px 20px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar icon={<UserOutlined />} style={{ background: '#2a9299' }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: '#fff', fontWeight: 500, fontSize: 14 }}>{user?.name}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>{getRoleLabel(user?.role)}</div>
            </div>
          </div>
          <div
            onClick={handleLogout}
            style={{
              marginTop: 12,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#ff7875',
              fontSize: 13,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <LogoutOutlined style={{ marginRight: 8 }} />
            Đăng xuất
          </div>
        </div>
      </Drawer>

      <Layout>
        {/* Header */}
        <Header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            <div
              className="header-toggle"
              onClick={() => isMobile ? setMobileMenuOpen(true) : setCollapsed(!collapsed)}
            >
              {isMobile ? (
                <MenuUnfoldOutlined />
              ) : (
                collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />
              )}
            </div>

            {/* Page title on mobile */}
            {isMobile && (
              <span style={{ fontWeight: 600, color: '#134e52', fontSize: 16 }}>
                {menuItems.find(item => item.key === location.pathname)?.label || 'BuyNow'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
            {/* Notifications */}
            <Badge count={0} size="small">
              <div className="header-toggle">
                <BellOutlined style={{ fontSize: isMobile ? 16 : 18 }} />
              </div>
            </Badge>

            {/* User Dropdown */}
            <Dropdown menu={userMenu} placement="bottomRight" trigger={['click']}>
              <div className="user-dropdown">
                <Avatar
                  className="user-avatar"
                  icon={<UserOutlined />}
                  size={isMobile ? 32 : 36}
                />
                {!isMobile && <span className="user-name">{user?.name}</span>}
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
