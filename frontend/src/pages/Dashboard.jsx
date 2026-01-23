import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Row, Col, Card, Statistic, Table, Tag, Space, Button, Empty } from 'antd'
import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  WarningOutlined,
  ArrowRightOutlined,
  RiseOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersAPI, customersAPI, productsAPI, stockAPI } from '../services/api'
import { useAuthStore } from '../store'

const Dashboard = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
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
    PENDING: { color: 'orange', label: 'Mới tạo', className: 'pending' },
    APPROVED: { color: 'blue', label: 'Đã duyệt', className: 'approved' },
    COMPLETED: { color: 'green', label: 'Hoàn thành', className: 'completed' },
    CANCELLED: { color: 'red', label: 'Đã hủy', className: 'cancelled' },
  }

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
          {Number(val).toLocaleString('vi-VN')} đ
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = statusConfig[status]
        return (
          <Tag color={config.color}>
            <span className={`status-tag ${config.className}`}>
              {config.label}
            </span>
          </Tag>
        )
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
      render: (val, record) => (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{
            width: 60,
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
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{
            color: '#de350b',
            fontWeight: 600,
            fontSize: 13,
          }}>
            {val}
          </span>
        </div>
      ),
    },
    {
      title: 'Tối thiểu',
      dataIndex: 'minStock',
      key: 'minStock',
      render: (val) => (
        <span style={{ color: '#788492' }}>{val}</span>
      ),
    },
  ]

  const StatCard = ({ title, value, icon, type, suffix }) => (
    <Card className={`stat-card ${type}`} hoverable>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <Statistic
            title={title}
            value={value}
            suffix={suffix}
          />
        </div>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
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

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="dashboard-welcome">
        <Row align="middle" justify="space-between">
          <Col>
            <h2>{getGreeting()}, {user?.name}!</h2>
            <p>
              Hôm nay là {dayjs().format('dddd, DD/MM/YYYY')}.
              Chúc bạn một ngày làm việc hiệu quả.
            </p>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<ShoppingCartOutlined />}
              onClick={() => navigate('/orders/create')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                backdropFilter: 'blur(10px)',
              }}
            >
              Tạo đơn hàng mới
            </Button>
          </Col>
        </Row>
      </div>

      {/* Stats Cards */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Tổng đơn hàng"
            value={stats.totalOrders}
            icon={<ShoppingCartOutlined />}
            type="orders"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Khách hàng"
            value={stats.totalCustomers}
            icon={<UserOutlined />}
            type="customers"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Sản phẩm"
            value={stats.totalProducts}
            icon={<ShoppingOutlined />}
            type="products"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Cảnh báo tồn kho"
            value={stats.lowStockCount}
            icon={<WarningOutlined />}
            type="alerts"
          />
        </Col>
      </Row>

      {/* Content Grid */}
      <Row gutter={[24, 24]}>
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
              <Button
                type="link"
                onClick={() => navigate('/orders')}
                style={{ padding: 0 }}
              >
                Xem tất cả <ArrowRightOutlined />
              </Button>
            }
            loading={loading}
          >
            {recentOrders.length > 0 ? (
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
                <span>Sản phẩm sắp hết hàng</span>
              </Space>
            }
            extra={
              stats.lowStockCount > 0 && (
                <Tag color="warning">{stats.lowStockCount} sản phẩm</Tag>
              )
            }
            loading={loading}
          >
            {lowStockProducts.length > 0 ? (
              <Table
                dataSource={lowStockProducts.slice(0, 5)}
                columns={stockColumns}
                rowKey="id"
                pagination={false}
                size="middle"
                onRow={(record) => ({
                  onClick: () => navigate('/stock'),
                  style: { cursor: 'pointer' },
                })}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '40px 0',
                color: '#22a06b',
              }}>
                <ShoppingOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.5 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>
                  Tất cả sản phẩm đều đủ hàng
                </p>
              </div>
            )}

            {lowStockProducts.length > 5 && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Button
                  type="link"
                  onClick={() => navigate('/stock')}
                >
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
