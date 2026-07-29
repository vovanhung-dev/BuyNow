import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Input, Space, Select, DatePicker, Tag, Typography, message, Card, Grid } from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined, ClockCircleOutlined, UserOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersAPI } from '../../services/api'
import PullToRefresh from '../../components/common/PullToRefresh'
import LoadMoreButton from '../../components/common/LoadMoreButton'

const { Title } = Typography
const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

const statusConfig = {
  PENDING: { color: 'orange', label: 'Mới tạo' },
  APPROVED: { color: 'blue', label: 'Đã duyệt' },
  COMPLETED: { color: 'green', label: 'Hoàn thành' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

const OrderList = () => {
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const sortRef = useRef({ field: null, order: null })

  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
    setOrders([])
    loadOrders(1, true)
  }, [search, status, dateRange])

  const loadOrders = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = {
        search,
        status,
        page,
        limit: pagination.pageSize,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      if (sortRef.current.field && sortRef.current.order) {
        params.sortBy = sortRef.current.field
        params.sortOrder = sortRef.current.order
      }

      const res = await ordersAPI.getAll(params)
      const newData = res.data || []

      if (reset || page === 1) {
        setOrders(newData)
      } else {
        setOrders(prev => [...prev, ...newData])
      }

      setPagination(prev => ({
        ...prev,
        current: page,
        total: res.pagination?.total || 0
      }))
    } catch (error) {
      message.error('Lỗi tải danh sách đơn hàng')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, status, dateRange, pagination.pageSize])

  const handleRefresh = useCallback(async () => {
    await loadOrders(1, true)
  }, [loadOrders])

  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.current + 1
    loadOrders(nextPage, false)
  }, [pagination.current, loadOrders])

  const hasMore = orders.length < pagination.total

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  // Mobile Order Card
  const OrderCard = ({ order }) => (
    <Card
      size="small"
      style={{ marginBottom: 12, cursor: 'pointer' }}
      onClick={() => navigate(`/orders/${order.id}`)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontWeight: 600, color: '#134e52', fontSize: 15 }}>{order.code}</div>
          <div style={{ fontSize: 13, color: '#5e6c7b', marginTop: 2 }}>{order.customerName}</div>
        </div>
        <Tag color={statusConfig[order.status]?.color}>
          {statusConfig[order.status]?.label}
        </Tag>
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, color: '#788492' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {dayjs(order.orderDate).format('DD/MM/YYYY')}
          </div>
          {order.user?.name && (
            <div style={{ fontSize: 12, color: '#98a4b3', marginTop: 2 }}>
              <UserOutlined style={{ marginRight: 4 }} />
              {order.user.name}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: '#2a9299', fontSize: 15 }}>{formatPrice(order.total)}</div>
          {Number(order.debtAmount) > 0 && (
            <div style={{ fontSize: 12, color: '#de350b', marginTop: 2 }}>
              Nợ: {formatPrice(order.debtAmount)}
            </div>
          )}
        </div>
      </div>
    </Card>
  )

  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', width: 140, sorter: (a, b) => (a.code || '').localeCompare(b.code || '') },
    {
      title: 'Ngày',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 100,
      sorter: (a, b) => new Date(a.orderDate) - new Date(b.orderDate),
      render: (val) => dayjs(val).format('DD/MM/YYYY'),
    },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName', sorter: (a, b) => (a.customerName || '').localeCompare(b.customerName || '', 'vi') },
    {
      title: 'Nhân viên',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      sorter: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || '', 'vi'),
      render: (user) => user?.name || '-',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      sorter: (a, b) => Number(a.total) - Number(b.total),
      render: formatPrice,
    },
    {
      title: 'Còn nợ',
      dataIndex: 'debtAmount',
      key: 'debtAmount',
      width: 120,
      sorter: (a, b) => Number(a.debtAmount) - Number(b.debtAmount),
      render: (val) => (
        <span style={{ color: Number(val) > 0 ? 'red' : 'green' }}>
          {formatPrice(val)}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      sorter: (a, b) => (a.status || '').localeCompare(b.status || ''),
      render: (val) => (
        <Tag color={statusConfig[val]?.color}>{statusConfig[val]?.label}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/orders/${record.id}`)}
        />
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16
      }}>
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Đơn hàng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/create')} block={isMobile}>
          Tạo đơn hàng
        </Button>
      </div>

      {/* Filters */}
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%' }} direction={isMobile ? 'vertical' : 'horizontal'} wrap>
          <Input
            placeholder="Tìm mã đơn, tên KH..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 200 }}
            allowClear
          />
          <Select
            placeholder="Trạng thái"
            value={status}
            onChange={setStatus}
            style={{ width: isMobile ? '100%' : 150 }}
            allowClear
          >
            <Select.Option value="PENDING">Mới tạo</Select.Option>
            <Select.Option value="APPROVED">Đã duyệt</Select.Option>
            <Select.Option value="COMPLETED">Hoàn thành</Select.Option>
            <Select.Option value="CANCELLED">Đã hủy</Select.Option>
          </Select>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
            style={{ width: isMobile ? '100%' : 'auto' }}
          />
        </Space>
      </div>

      {/* Content - Table or Cards */}
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          <div>
            {loading ? (
              <Card loading={true} />
            ) : (
              <>
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
              </>
            )}
          </div>
        </PullToRefresh>
      ) : (
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          onChange={(pag, filters, sorter, extra) => {
            const order = sorter && sorter.order ? sorter.order : null
            sortRef.current = { field: order ? (sorter.field || sorter.columnKey) : null, order }
            const targetPage = extra.action === 'sort' ? 1 : pag.current
            setPagination(prev => ({ ...prev, current: targetPage, pageSize: pag.pageSize }))
            loadOrders(targetPage, true)
          }}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} đơn hàng`,
          }}
        />
      )}

      {/* Nút nổi tạo đơn - luôn hiện trên mobile */}
      {isMobile && (
        <button
          type="button"
          onClick={() => navigate('/orders/create')}
          style={{
            position: 'fixed',
            right: 16,
            bottom: 'calc(72px + env(safe-area-inset-bottom, 0px))',
            zIndex: 120,
            height: 52,
            padding: '0 22px',
            border: 'none',
            borderRadius: 26,
            background: '#2a9299',
            color: '#fff',
            fontWeight: 600,
            fontSize: 15,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: '0 6px 20px rgba(42,146,153,0.45)',
            cursor: 'pointer',
          }}
        >
          <PlusOutlined /> Tạo đơn
        </button>
      )}
    </div>
  )
}

export default OrderList
