import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Card, Table, DatePicker, Space, Row, Col, Statistic,
  Tag, Button, Grid, Spin, Empty
} from 'antd'
import {
  ArrowLeftOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  WalletOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  UserOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { reportsAPI } from '../../services/api'
import PullToRefresh from '../../components/common/PullToRefresh'
import LoadMoreButton from '../../components/common/LoadMoreButton'

const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

const EmployeeOrdersDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [employee, setEmployee] = useState(null)
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({})
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  // Get date range from URL params or default to current month
  const getInitialDateRange = () => {
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate && endDate) {
      return [dayjs(startDate), dayjs(endDate)]
    }
    return [dayjs().startOf('month'), dayjs().endOf('month')]
  }

  const [dateRange, setDateRange] = useState(getInitialDateRange)

  const loadData = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = { page, limit: pagination.pageSize }
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const res = await reportsAPI.getEmployeeOrders(id, params)

      setEmployee(res.employee)
      setSummary(res.summary || {})

      if (reset || page === 1) {
        setOrders(res.data || [])
      } else {
        setOrders(prev => [...prev, ...(res.data || [])])
      }

      setPagination(prev => ({
        ...prev,
        current: page,
        total: res.pagination?.total || 0,
      }))
    } catch (error) {
      console.error('Load employee orders error:', error)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [id, dateRange, pagination.pageSize])

  useEffect(() => {
    setOrders([])
    setPagination(prev => ({ ...prev, current: 1 }))
    loadData(1, true)
  }, [dateRange])

  const handleRefresh = useCallback(async () => {
    await loadData(1, true)
  }, [loadData])

  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.current + 1
    loadData(nextPage, false)
  }, [pagination.current, loadData])

  const hasMore = orders.length < pagination.total

  const formatPrice = (val) => Number(val || 0).toLocaleString('vi-VN')

  const statusConfig = {
    PENDING: { color: 'orange', label: 'Mới tạo' },
    APPROVED: { color: 'blue', label: 'Đã duyệt' },
    COMPLETED: { color: 'green', label: 'Hoàn thành' },
    CANCELLED: { color: 'red', label: 'Đã hủy' },
  }

  const presets = [
    { label: 'Hôm nay', value: [dayjs(), dayjs()] },
    { label: 'Tuần này', value: [dayjs().startOf('week'), dayjs().endOf('week')] },
    { label: 'Tháng này', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
    { label: 'Tháng trước', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
  ]

  // Table columns
  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      key: 'code',
      width: 120,
      render: (code) => (
        <span style={{ fontWeight: 600, color: '#134e52', fontFamily: 'monospace' }}>
          {code}
        </span>
      ),
    },
    {
      title: 'Ngày',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 110,
      render: (date) => dayjs(date).format('DD/MM/YYYY'),
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customerName',
      key: 'customerName',
      ellipsis: true,
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500 }}>{name}</div>
          <div style={{ fontSize: 12, color: '#888' }}>{record.customer?.code}</div>
        </div>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      width: 130,
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#134e52' }}>
          {formatPrice(val)} đ
        </span>
      ),
    },
    {
      title: 'Đã thu',
      dataIndex: 'paidAmount',
      key: 'paidAmount',
      width: 120,
      align: 'right',
      render: (val) => (
        <span style={{ color: '#22a06b' }}>
          {formatPrice(val)} đ
        </span>
      ),
    },
    {
      title: 'Còn nợ',
      dataIndex: 'debtAmount',
      key: 'debtAmount',
      width: 120,
      align: 'right',
      render: (val) => (
        <span style={{ color: val > 0 ? '#de350b' : '#22a06b' }}>
          {formatPrice(val)} đ
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      align: 'center',
      render: (status) => (
        <Tag color={statusConfig[status]?.color}>
          {statusConfig[status]?.label}
        </Tag>
      ),
    },
  ]

  // Mobile Order Card
  const OrderCard = ({ order }) => (
    <Card
      size="small"
      style={{ marginBottom: 12, cursor: 'pointer' }}
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#134e52', fontFamily: 'monospace' }}>
            {order.code}
          </div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {dayjs(order.orderDate).format('DD/MM/YYYY HH:mm')}
          </div>
        </div>
        <Tag color={statusConfig[order.status]?.color}>
          {statusConfig[order.status]?.label}
        </Tag>
      </div>

      <div style={{
        marginTop: 12,
        padding: 10,
        background: '#f9fafb',
        borderRadius: 8,
      }}>
        <div style={{ fontWeight: 500, marginBottom: 4 }}>{order.customerName}</div>
        <div style={{ fontSize: 12, color: '#888' }}>{order.customer?.code}</div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 8,
        marginTop: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: '#788492' }}>Tổng tiền</div>
          <div style={{ fontWeight: 600, color: '#134e52' }}>
            {formatPrice(order.total)} đ
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#788492' }}>Đã thu</div>
          <div style={{ fontWeight: 500, color: '#22a06b' }}>
            {formatPrice(order.paidAmount)} đ
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#788492' }}>Còn nợ</div>
          <div style={{
            fontWeight: 500,
            color: Number(order.debtAmount) > 0 ? '#de350b' : '#22a06b'
          }}>
            {formatPrice(order.debtAmount)} đ
          </div>
        </div>
      </div>
    </Card>
  )

  if (loading && !employee) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/reports/employee')}
        />
        <div style={{ flex: 1 }}>
          <h1 className="page-title" style={{ margin: 0, fontSize: isMobile ? 16 : 20 }}>
            {employee?.name || 'Nhân viên'}
          </h1>
          <div style={{ fontSize: 13, color: '#788492', marginTop: 2 }}>
            {employee?.email}
          </div>
        </div>
      </div>

      {/* Date Filter */}
      <div style={{ marginBottom: 16 }}>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          presets={presets}
          style={{ width: isMobile ? '100%' : 280 }}
          placeholder={['Từ ngày', 'Đến ngày']}
        />
      </div>

      {/* Summary Cards */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small">
            <Statistic
              title={<span style={{ fontSize: 12, color: '#788492' }}>Số đơn</span>}
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
              title={<span style={{ fontSize: 12, color: '#788492' }}>Đã thu</span>}
              value={formatPrice(summary.totalPaid)}
              suffix="đ"
              prefix={<CheckCircleOutlined style={{ color: '#2a9299' }} />}
              valueStyle={{ color: '#2a9299', fontSize: isMobile ? 16 : 20 }}
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

      {/* Orders List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <Empty description="Không có đơn hàng trong khoảng thời gian này" />
        </Card>
      ) : isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          <div>
            {orders.map((order) => (
              <OrderCard key={order.id} order={order} />
            ))}
            <LoadMoreButton
              loading={loadingMore}
              hasMore={hasMore}
              onClick={handleLoadMore}
              current={orders.length}
              total={pagination.total}
              itemName="đơn hàng"
            />
          </div>
        </PullToRefresh>
      ) : (
        <Card styles={{ body: { padding: 0 } }}>
          <Table
            dataSource={orders}
            columns={columns}
            rowKey="id"
            loading={loading}
            pagination={{
              ...pagination,
              showSizeChanger: true,
              showTotal: (total) => `Tổng ${total} đơn hàng`,
              onChange: (page, pageSize) => {
                setPagination(prev => ({ ...prev, current: page, pageSize }))
                loadData(page, true)
              },
            }}
            onRow={(record) => ({
              onClick: () => navigate(`/orders/${record.id}`),
              style: { cursor: 'pointer' },
            })}
          />
        </Card>
      )}
    </div>
  )
}

export default EmployeeOrdersDetail
