import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Table, Tag, Space, Button, Empty, Grid, List } from 'antd'
import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  RiseOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  DatabaseOutlined,
  DollarOutlined,
  BarChartOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersAPI, customersAPI, productsAPI, stockAPI } from '../services/api'
import { useAuthStore } from '../store'

const { useBreakpoint } = Grid

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    lowStockCount: 0,
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [ordersRes, customersRes, productsRes, alertsRes] = await Promise.all([
        ordersAPI.getAll({ limit: 5 }),
        customersAPI.getAll({ limit: 1 }),
        productsAPI.getAll({ limit: 1 }),
        stockAPI.getAlerts(),
      ])

      setStats({
        totalOrders: ordersRes.pagination?.total || 0,
        totalCustomers: customersRes.pagination?.total || 0,
        totalProducts: productsRes.pagination?.total || 0,
        lowStockCount: alertsRes.count || 0,
      })

      setRecentOrders(ordersRes.data || [])
      setLowStockProducts(alertsRes.data || [])
    } catch (error) {
      console.error('Load dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const getGreeting = () => {
    const hour = dayjs().hour()
    if (hour < 12) return 'Chào buổi sáng'
    if (hour < 18) return 'Chào buổi chiều'
    return 'Chào buổi tối'
  }

  const statusConfig = {
    PENDING: { color: 'orange', label: 'Mới tạo' },
    APPROVED: { color: 'blue', label: 'Đã duyệt' },
    COMPLETED: { color: 'green', label: 'Hoàn thành' },
    CANCELLED: { color: 'red', label: 'Đã hủy' },
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  // Desktop columns
  const orderColumns = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      key: 'code',
      render: (code) => (
        <span style={{ fontWeight: 600, color: '#134e52' }}>{code}</span>
      ),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#2a9299' }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status]
        return <Tag color={config.color}>{config.label}</Tag>
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => (
        <Space size={4}>
          <ClockCircleOutlined style={{ color: '#788492' }} />
          <span style={{ color: '#5e6c7b' }}>
            {dayjs(date).format('DD/MM/YYYY')}
          </span>
        </Space>
      ),
    },
  ]

  const stockColumns = [
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      width: 100,
      render: (sku) => (
        <span style={{ fontFamily: 'monospace', fontSize: 13 }}>{sku}</span>
      ),
    },
    {
      title: 'Tên sản phẩm',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      width: 120,
      render: (val, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 50,
            height: 6,
            background: '#ffedeb',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              width: `${Math.min((val / record.minStock) * 100, 100)}%`,
              height: '100%',
              background: val <= record.minStock / 2 ? '#de350b' : '#e5a100',
              borderRadius: 3,
            }} />
          </div>
          <span style={{ color: '#de350b', fontWeight: 600, fontSize: 13 }}>
            {val}
          </span>
        </div>
      ),
    },
  ]

  const StatCard = ({ title, value, icon, type }) => (
    <Card className={`stat-card ${type}`} hoverable size={isMobile ? 'small' : 'default'}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Statistic title={title} value={value} />
        </div>
        <div style={{
          width: isMobile ? 44 : 56,
          height: isMobile ? 44 : 56,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: isMobile ? 20 : 24,
          background: type === 'orders' ? '#d4f0f2' :
                     type === 'customers' ? '#fdf5e0' :
                     type === 'products' ? '#dcf7e9' : '#ffedeb',
          color: type === 'orders' ? '#21777e' :
                 type === 'customers' ? '#d4a853' :
                 type === 'products' ? '#22a06b' : '#de350b',
        }}>
          {icon}
        </div>
      </div>
    </Card>
  )

  // Mobile Order Item
  const OrderItem = ({ order }) => (
    <div
      onClick={() => navigate(`/orders/${order.id}`)}
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#134e52' }}>{order.code}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>{order.customerName}</div>
        </div>
        <Tag color={statusConfig[order.status].color}>
          {statusConfig[order.status].label}
        </Tag>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontWeight: 600, color: '#2a9299' }}>{formatPrice(order.total)}</span>
        <span style={{ fontSize: 12, color: '#999' }}>{dayjs(order.createdAt).format('DD/MM/YYYY')}</span>
      </div>
    </div>
  )

  // Mobile Stock Item
  const StockItem = ({ product }) => (
    <div
      onClick={() => navigate('/stock')}
      style={{
        padding: '12px 0',
        borderBottom: '1px solid #f0f0f0',
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>{product.name}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>SKU: {product.sku}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: '#de350b', fontWeight: 600 }}>{product.stock}</div>
          <div style={{ fontSize: 11, color: '#999' }}>/ {product.minStock}</div>
        </div>
      </div>
    </div>
  )

  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role)

  const quickActions = [
    { label: 'Tạo đơn hàng', desc: 'Lập hóa đơn bán hàng mới', icon: <PlusOutlined />, color: '#2a9299', bg: '#eef9fa', to: '/orders/create' },
    { label: 'Khách hàng', desc: 'Danh sách và công nợ', icon: <UserOutlined />, color: '#0065ff', bg: '#e6f2ff', to: '/customers' },
    ...(isManager ? [{ label: 'Sản phẩm', desc: 'Quản lý hàng hóa, giá bán', icon: <ShoppingOutlined />, color: '#22a06b', bg: '#dcf7e9', to: '/products' }] : []),
    ...(isManager ? [{ label: 'Tồn kho', desc: 'Nhập kho, kiểm tồn', icon: <DatabaseOutlined />, color: '#e5a100', bg: '#fff7d6', to: '/stock' }] : []),
    { label: 'Thanh toán', desc: 'Ghi nhận thu tiền', icon: <DollarOutlined />, color: '#7048e8', bg: '#f0ebff', to: '/payments' },
    ...(isManager ? [{ label: 'Doanh thu NV', desc: 'Báo cáo theo nhân viên', icon: <BarChartOutlined />, color: '#e64980', bg: '#ffe8f1', to: '/reports/employee' }] : []),
  ]

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        alignItems: isMobile ? 'stretch' : 'center',
        gap: 12,
        marginBottom: 20,
      }}>
        <div>
          <h1 className="page-title" style={{ margin: 0, fontSize: isMobile ? 20 : 26 }}>
            {getGreeting()}, {user?.name}
          </h1>
          <p style={{ margin: '6px 0 0', color: '#788492', fontSize: isMobile ? 13 : 14 }}>
            {dayjs().format('dddd, DD/MM/YYYY')} · Tổng quan hoạt động kinh doanh
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/orders/create')}
          size={isMobile ? 'middle' : 'large'}
          style={{ width: isMobile ? '100%' : 'auto' }}
        >
          Tạo đơn hàng
        </Button>
      </div>

      {/* Stats Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            title="Đơn hàng"
            value={stats.totalOrders}
            icon={<ShoppingCartOutlined />}
            type="orders"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            title="Khách hàng"
            value={stats.totalCustomers}
            icon={<UserOutlined />}
            type="customers"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            title="Sản phẩm"
            value={stats.totalProducts}
            icon={<ShoppingOutlined />}
            type="products"
          />
        </Col>
        <Col xs={12} sm={12} lg={6}>
          <StatCard
            title="Cảnh báo"
            value={stats.lowStockCount}
            icon={<WarningOutlined />}
            type="alerts"
          />
        </Col>
      </Row>

      {/* Quick Access */}
      <div style={{ margin: '4px 0 12px', fontWeight: 600, fontSize: 15, color: '#2d3640' }}>
        Truy cập nhanh
      </div>
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {quickActions.map((action) => (
          <Col xs={12} sm={8} lg={isManager ? 4 : 8} key={action.to}>
            <div className="quick-action" onClick={() => navigate(action.to)}>
              <div className="quick-action-icon" style={{ background: action.bg, color: action.color }}>
                {action.icon}
              </div>
              <div className="quick-action-label">{action.label}</div>
              <div className="quick-action-desc">{action.desc}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Content Grid */}
      <Row gutter={[16, 16]}>
        {/* Recent Orders */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <RiseOutlined style={{ color: '#2a9299' }} />
                <span>Đơn hàng gần đây</span>
              </Space>
            }
            extra={
              <Button type="link" onClick={() => navigate('/orders')} style={{ padding: 0 }}>
                Xem tất cả <ArrowRightOutlined />
              </Button>
            }
            loading={loading}
            size={isMobile ? 'small' : 'default'}
            styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
          >
            {recentOrders.length > 0 ? (
              isMobile ? (
                <div>
                  {recentOrders.map(order => (
                    <OrderItem key={order.id} order={order} />
                  ))}
                </div>
              ) : (
                <Table
                  dataSource={recentOrders}
                  columns={orderColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  onRow={(record) => ({
                    onClick: () => navigate(`/orders/${record.id}`),
                    style: { cursor: 'pointer' },
                  })}
                />
              )
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Chưa có đơn hàng nào"
              >
                <Button type="primary" onClick={() => navigate('/orders/create')}>
                  Tạo đơn hàng đầu tiên
                </Button>
              </Empty>
            )}
          </Card>
        </Col>

        {/* Low Stock Alert */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#e5a100' }} />
                <span>Sắp hết hàng</span>
              </Space>
            }
            extra={
              stats.lowStockCount > 0 && (
                <Tag color="warning">{stats.lowStockCount}</Tag>
              )
            }
            loading={loading}
            size={isMobile ? 'small' : 'default'}
            styles={{ body: { padding: isMobile ? '12px' : '24px' } }}
          >
            {lowStockProducts.length > 0 ? (
              isMobile ? (
                <div>
                  {lowStockProducts.slice(0, 5).map(product => (
                    <StockItem key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <Table
                  dataSource={lowStockProducts.slice(0, 5)}
                  columns={stockColumns}
                  rowKey="id"
                  pagination={false}
                  size="middle"
                  onRow={() => ({
                    onClick: () => navigate('/stock'),
                    style: { cursor: 'pointer' },
                  })}
                />
              )
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#22a06b' }}>
                <ShoppingOutlined style={{ fontSize: 40, marginBottom: 12, opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Tất cả đều đủ hàng</p>
              </div>
            )}

            {lowStockProducts.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: 12 }}>
                <Button type="link" onClick={() => navigate('/stock')}>
                  Xem thêm {lowStockProducts.length - 5} sản phẩm <ArrowRightOutlined />
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
