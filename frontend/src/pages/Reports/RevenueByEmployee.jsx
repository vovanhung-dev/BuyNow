import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card, Table, DatePicker, Space, Row, Col, Statistic,
  Tag, Button, Grid, Spin, Empty
} from 'antd'
import {
  UserOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  WalletOutlined,
  ArrowRightOutlined,
  CalendarOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { reportsAPI } from '../../services/api'
import { useAuthStore } from '../../store'

const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

const RevenueByEmployee = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState([])
  const [summary, setSummary] = useState({})
  const [dateRange, setDateRange] = useState([
    dayjs().startOf('month'),
    dayjs().endOf('month')
  ])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const res = await reportsAPI.getByEmployee(params)
      setData(res.data || [])
      setSummary(res.summary || {})
    } catch (error) {
      console.error('Load report error:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange])

  useEffect(() => {
    loadData()
  }, [loadData])

  const formatPrice = (val) => Number(val || 0).toLocaleString('vi-VN')

  const handleViewDetail = (employee) => {
    const params = new URLSearchParams()
    if (dateRange && dateRange[0] && dateRange[1]) {
      params.set('startDate', dateRange[0].format('YYYY-MM-DD'))
      params.set('endDate', dateRange[1].format('YYYY-MM-DD'))
    }
    navigate(`/reports/employee/${employee.id}?${params.toString()}`)
  }

  // Quick date presets
  const presets = [
    { label: 'Hôm nay', value: [dayjs(), dayjs()] },
    { label: 'Hôm qua', value: [dayjs().subtract(1, 'day'), dayjs().subtract(1, 'day')] },
    { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
    { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  ]

  const getRoleLabel = (role) => {
    const roles = { ADMIN: 'Admin', MANAGER: 'Quản lý', SALES: 'Nhân viên' }
    return roles[role] || role
  }

  const getRoleColor = (role) => {
    const colors = { ADMIN: 'purple', MANAGER: 'blue', SALES: 'green' }
    return colors[role] || 'default'
  }

  // Table columns for desktop
  const columns = [
    {
      title: '#',
      key: 'rank',
      width: 50,
      align: 'center',
      render: (_, __, index) => {
        if (index === 0) return <TrophyOutlined style={{ color: '#faad14', fontSize: 18 }} />
        if (index === 1) return <TrophyOutlined style={{ color: '#a0a0a0', fontSize: 16 }} />
        if (index === 2) return <TrophyOutlined style={{ color: '#cd7f32', fontSize: 16 }} />
        return <span style={{ color: '#999' }}>{index + 1}</span>
      },
    },
    {
      title: 'Nhân viên',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 600, color: '#2d3640' }}>{name}</div>
          <Tag color={getRoleColor(record.role)} style={{ marginTop: 4 }}>
            {getRoleLabel(record.role)}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Số đơn',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 90,
      align: 'center',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#2a9299' }}>{val}</span>
      ),
    },
    {
      title: 'Doanh thu',
      dataIndex: 'totalRevenue',
      key: 'totalRevenue',
      width: 150,
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#134e52' }}>
          {formatPrice(val)} đ
        </span>
      ),
      sorter: (a, b) => a.totalRevenue - b.totalRevenue,
    },
    {
      title: 'Đã thu',
      dataIndex: 'totalPaid',
      key: 'totalPaid',
      width: 140,
      align: 'right',
      render: (val) => (
        <span style={{ color: '#22a06b', fontWeight: 500 }}>
          {formatPrice(val)} đ
        </span>
      ),
    },
    {
      title: 'Còn nợ',
      dataIndex: 'totalDebt',
      key: 'totalDebt',
      width: 140,
      align: 'right',
      render: (val) => (
        <span style={{ color: val > 0 ? '#de350b' : '#22a06b', fontWeight: 500 }}>
          {formatPrice(val)} đ
        </span>
      ),
    },
    {
      title: 'TB/đơn',
      dataIndex: 'avgOrderValue',
      key: 'avgOrderValue',
      width: 130,
      align: 'right',
      render: (val) => (
        <span style={{ color: '#5e6c7b' }}>
          {formatPrice(val)} đ
        </span>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button
          type="text"
          icon={<ArrowRightOutlined />}
          onClick={() => handleViewDetail(record)}
          style={{ color: '#2a9299' }}
        />
      ),
    },
  ]

  // Mobile Employee Card
  const EmployeeCard = ({ employee, rank }) => {
    const getRankIcon = () => {
      if (rank === 0) return <TrophyOutlined style={{ color: '#faad14', fontSize: 20 }} />
      if (rank === 1) return <TrophyOutlined style={{ color: '#a0a0a0', fontSize: 18 }} />
      if (rank === 2) return <TrophyOutlined style={{ color: '#cd7f32', fontSize: 18 }} />
      return <span style={{ color: '#999', fontWeight: 600 }}>{rank + 1}</span>
    }

    return (
      <Card
        size="small"
        style={{ marginBottom: 12, cursor: 'pointer' }}
        onClick={() => handleViewDetail(employee)}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {/* Rank */}
          <div style={{
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: rank < 3 ? '#fffbe6' : '#f5f5f5',
            borderRadius: 8,
          }}>
            {getRankIcon()}
          </div>

          {/* Info */}
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#2d3640' }}>
                  {employee.name}
                </div>
                <Tag color={getRoleColor(employee.role)} style={{ marginTop: 4 }}>
                  {getRoleLabel(employee.role)}
                </Tag>
              </div>
              <ArrowRightOutlined style={{ color: '#ccc' }} />
            </div>

            {/* Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: 12,
              padding: 12,
              background: '#f9fafb',
              borderRadius: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, color: '#788492' }}>Doanh thu</div>
                <div style={{ fontWeight: 600, color: '#134e52' }}>
                  {formatPrice(employee.totalRevenue)} đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#788492' }}>Số đơn</div>
                <div style={{ fontWeight: 600, color: '#2a9299' }}>
                  {employee.totalOrders}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#788492' }}>Đã thu</div>
                <div style={{ fontWeight: 500, color: '#22a06b' }}>
                  {formatPrice(employee.totalPaid)} đ
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#788492' }}>Còn nợ</div>
                <div style={{
                  fontWeight: 500,
                  color: employee.totalDebt > 0 ? '#de350b' : '#22a06b'
                }}>
                  {formatPrice(employee.totalDebt)} đ
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}>
        <h1 className="page-title" style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>
          Doanh thu nhân viên
        </h1>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: isMobile ? '100%' : 'auto' }}>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            presets={presets}
            style={{ width: isMobile ? '100%' : 280 }}
            placeholder={['Từ ngày', 'Đến ngày']}
          />
        </Space>
      </div>

      {/* Summary Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title={<span style={{ fontSize: 12, color: '#788492' }}>Nhân viên</span>}
              value={summary.totalEmployees || 0}
              prefix={<UserOutlined style={{ color: '#2a9299' }} />}
              valueStyle={{ color: '#134e52', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title={<span style={{ fontSize: 12, color: '#788492' }}>Tổng đơn</span>}
              value={summary.totalOrders || 0}
              prefix={<ShoppingCartOutlined style={{ color: '#2a9299' }} />}
              valueStyle={{ color: '#134e52', fontSize: isMobile ? 20 : 24 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title={<span style={{ fontSize: 12, color: '#788492' }}>Doanh thu</span>}
              value={formatPrice(summary.totalRevenue)}
              suffix="đ"
              prefix={<DollarOutlined style={{ color: '#22a06b' }} />}
              valueStyle={{ color: '#22a06b', fontSize: isMobile ? 16 : 20 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title={<span style={{ fontSize: 12, color: '#788492' }}>Còn nợ</span>}
              value={formatPrice(summary.totalDebt)}
              suffix="đ"
              prefix={<WalletOutlined style={{ color: '#de350b' }} />}
              valueStyle={{ color: '#de350b', fontSize: isMobile ? 16 : 20 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Date Info */}
      {dateRange && dateRange[0] && dateRange[1] && (
        <div style={{
          marginBottom: 16,
          padding: '8px 12px',
          background: '#eef9fa',
          borderRadius: 8,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          color: '#2a9299',
          fontSize: 13,
        }}>
          <CalendarOutlined />
          <span>
            {dateRange[0].format('DD/MM/YYYY')} - {dateRange[1].format('DD/MM/YYYY')}
          </span>
        </div>
      )}

      {/* Data */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : data.length === 0 ? (
        <Card>
          <Empty description="Không có dữ liệu trong khoảng thời gian này" />
        </Card>
      ) : isMobile ? (
        <div>
          {data.filter(e => e.totalOrders > 0).map((employee, index) => (
            <EmployeeCard key={employee.id} employee={employee} rank={index} />
          ))}
          {data.filter(e => e.totalOrders === 0).length > 0 && (
            <div style={{ marginTop: 16, color: '#999', fontSize: 13, textAlign: 'center' }}>
              {data.filter(e => e.totalOrders === 0).length} nhân viên chưa có đơn hàng
            </div>
          )}
        </div>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={data.filter(e => e.totalOrders > 0)}
            columns={columns}
            rowKey="id"
            pagination={false}
            onRow={(record) => ({
              onClick: () => handleViewDetail(record),
              style: { cursor: 'pointer' },
            })}
          />
          {data.filter(e => e.totalOrders === 0).length > 0 && (
            <div style={{ padding: 16, color: '#999', fontSize: 13, borderTop: '1px solid #f0f0f0' }}>
              {data.filter(e => e.totalOrders === 0).length} nhân viên chưa có đơn hàng trong khoảng thời gian này
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default RevenueByEmployee
