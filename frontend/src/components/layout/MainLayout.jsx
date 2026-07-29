import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Layout, Menu, Dropdown, Avatar, Drawer, Grid } from 'antd'
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
  CloseOutlined,
  TeamOutlined,
  BarChartOutlined,
  AppstoreOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '../../store'

const { Header, Sider, Content } = Layout
const { useBreakpoint } = Grid

const getMenuItems = (userRole) => {
  const isManager = ['ADMIN', 'MANAGER'].includes(userRole)

  const items = [
    { key: '/', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: '/customers', icon: <UserOutlined />, label: 'Khách hàng' },
  ]

  // Products - only for ADMIN and MANAGER
  if (isManager) {
    items.push({ key: '/products', icon: <ShoppingOutlined />, label: 'Sản phẩm' })
  }

  items.push(
    { key: '/orders', icon: <ShoppingCartOutlined />, label: 'Đơn hàng' },
  )

  // Stock - only for ADMIN and MANAGER
  if (isManager) {
    items.push({ key: '/stock', icon: <DatabaseOutlined />, label: 'Tồn kho' })
  }

  items.push(
    { key: '/payments', icon: <DollarOutlined />, label: 'Thanh toán' },
  )

  // Reports - only for ADMIN and MANAGER
  if (isManager) {
    items.push({ key: '/reports/employee', icon: <BarChartOutlined />, label: 'Doanh thu NV' })
  }

  // User management - only for ADMIN
  if (userRole === 'ADMIN') {
    items.push({ key: '/users', icon: <TeamOutlined />, label: 'Tài khoản' })
  }

  return items
}

// Get active menu key based on current path
const getActiveMenuKey = (pathname, menuItems) => {
  // Exact match first
  const exactMatch = menuItems.find(item => item.key === pathname)
  if (exactMatch) return pathname

  // Find parent path (e.g., /reports/employee/123 -> /reports/employee)
  for (const item of menuItems) {
    if (pathname.startsWith(item.key + '/') || pathname.startsWith(item.key.replace(/\/$/, '') + '/')) {
      return item.key
    }
  }

  // Default fallback
  return pathname
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
  const activeMenuKey = getActiveMenuKey(location.pathname, menuItems)
  const bottomNavItems = menuItems.slice(0, 4)

  // Ẩn thanh điều hướng dưới ở các trang form (có thanh nút lưu riêng)
  const isFormPage = /\/(create|edit|import|adjust)(\/|$)/.test(location.pathname)
  const showBottomNav = isMobile && !isFormPage

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
      <div className="logo" style={{ justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start' }}>
        {(collapsed && !isMobile) ? (
          <span className="logo-mark">B</span>
        ) : (
          <>
            <span className="logo-mark">B</span>
            <span className="logo-info">
              <span className="logo-text">BuyNow</span>
              <span className="logo-sub">Hệ thống bán hàng</span>
            </span>
          </>
        )}
      </div>
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[activeMenuKey]}
        items={menuItems}
        onClick={handleMenuClick}
      />
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh' }} className={showBottomNav ? 'has-bottom-nav' : ''}>
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
          body: { padding: 0, background: '#ffffff' },
          header: { display: 'none' },
        }}
        className="mobile-drawer"
      >
        <div className="logo" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="logo-mark">B</span>
            <span className="logo-info">
              <span className="logo-text">BuyNow</span>
              <span className="logo-sub">Hệ thống bán hàng</span>
            </span>
          </div>
          <CloseOutlined
            onClick={() => setMobileMenuOpen(false)}
            style={{ color: 'var(--neutral-500)', fontSize: 18, cursor: 'pointer' }}
          />
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[activeMenuKey]}
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
          borderTop: '1px solid var(--neutral-200)',
          background: '#fafbfc',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar icon={<UserOutlined />} style={{ background: '#2a9299' }} />
            <div style={{ flex: 1 }}>
              <div style={{ color: 'var(--neutral-800)', fontWeight: 600, fontSize: 14 }}>{user?.name}</div>
              <div style={{ color: 'var(--neutral-500)', fontSize: 12 }}>{getRoleLabel(user?.role)}</div>
            </div>
          </div>
          <div
            onClick={handleLogout}
            style={{
              marginTop: 12,
              padding: '10px 12px',
              background: 'var(--error-100)',
              borderRadius: 8,
              color: 'var(--error-500)',
              fontSize: 13,
              fontWeight: 500,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 14 }}>
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

            {/* Tên trang hiện tại - chỉ mobile để định vị */}
            {isMobile && (
              <span style={{ fontWeight: 600, color: '#134e52', fontSize: 16 }}>
                {menuItems.find(item => item.key === activeMenuKey)?.label || 'BuyNow'}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
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

      {/* Bottom Navigation - Mobile */}
      {showBottomNav && (
        <nav className="bottom-nav">
          {bottomNavItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`bottom-nav-item ${activeMenuKey === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
          <button
            type="button"
            className="bottom-nav-item"
            onClick={() => setMobileMenuOpen(true)}
          >
            <AppstoreOutlined />
            <span>Thêm</span>
          </button>
        </nav>
      )}
    </Layout>
  )
}

export default MainLayout
