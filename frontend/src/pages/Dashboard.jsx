import { useEffect, useState } from 'react'
import { Row, Col, Card, Statistic, Table, Typography, Space, Tag } from 'antd'
import {
  ShoppingCartOutlined,
  UserOutlined,
  ShoppingOutlined,
  DollarOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { ordersAPI, customersAPI, productsAPI, stockAPI } from '../services/api'

const { Title } = Typography

const Dashboard = () => {
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

  const orderColumns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code' },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName' },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      render: (val) => Number(val).toLocaleString('vi-VN') + ' đ',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const colors = {
          PENDING: 'orange',
          APPROVED: 'blue',
          COMPLETED: 'green',
          CANCELLED: 'red',
        }
        const labels = {
          PENDING: 'Mới tạo',
          APPROVED: 'Đã duyệt',
          COMPLETED: 'Hoàn thành',
          CANCELLED: 'Đã hủy',
        }
        return <Tag color={colors[status]}>{labels[status]}</Tag>
      },
    },
  ]

  const stockColumns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Tên SP', dataIndex: 'name', key: 'name' },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      render: (val) => <span style={{ color: 'red', fontWeight: 'bold' }}>{val}</span>,
    },
    { title: 'Tối thiểu', dataIndex: 'minStock', key: 'minStock' },
  ]

  return (
    <div>
      <Title level={4}>Tổng quan</Title>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Đơn hàng"
              value={stats.totalOrders}
              prefix={<ShoppingCartOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Khách hàng"
              value={stats.totalCustomers}
              prefix={<UserOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Sản phẩm"
              value={stats.totalProducts}
              prefix={<ShoppingOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Cảnh báo tồn kho"
              value={stats.lowStockCount}
              prefix={<WarningOutlined />}
              valueStyle={{ color: stats.lowStockCount > 0 ? '#cf1322' : '#3f8600' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={14}>
          <Card title="Đơn hàng gần đây" loading={loading}>
            <Table
              dataSource={recentOrders}
              columns={orderColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={10}>
          <Card
            title={
              <Space>
                <WarningOutlined style={{ color: '#faad14' }} />
                Sản phẩm sắp hết hàng
              </Space>
            }
            loading={loading}
          >
            <Table
              dataSource={lowStockProducts.slice(0, 5)}
              columns={stockColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default Dashboard
