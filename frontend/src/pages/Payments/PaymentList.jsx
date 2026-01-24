import { useEffect, useState, useCallback } from 'react'
import { Table, DatePicker, Space, Typography, message, Tag, Card, Grid } from 'antd'
import { ClockCircleOutlined, UserOutlined, FileTextOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { paymentsAPI } from '../../services/api'
import PullToRefresh from '../../components/common/PullToRefresh'
import LoadMoreButton from '../../components/common/LoadMoreButton'

const { Title } = Typography
const { RangePicker } = DatePicker
const { useBreakpoint } = Grid

const PaymentList = () => {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [dateRange, setDateRange] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
    setPayments([])
    loadPayments(1, true)
  }, [dateRange])

  const loadPayments = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const params = {
        page,
        limit: pagination.pageSize,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const res = await paymentsAPI.getAll(params)
      const newData = res.data || []

      if (reset || page === 1) {
        setPayments(newData)
      } else {
        setPayments(prev => [...prev, ...newData])
      }

      setPagination(prev => ({
        ...prev,
        current: page,
        total: res.pagination?.total || 0
      }))
    } catch (error) {
      message.error('Lỗi tải danh sách thanh toán')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [dateRange, pagination.pageSize])

  const handleRefresh = useCallback(async () => {
    await loadPayments(1, true)
  }, [loadPayments])

  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.current + 1
    loadPayments(nextPage, false)
  }, [pagination.current, loadPayments])

  const hasMore = payments.length < pagination.total

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  // Mobile Payment Card
  const PaymentCard = ({ payment }) => (
    <Card size="small" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#788492' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {dayjs(payment.paymentDate).format('DD/MM/YYYY HH:mm')}
          </div>
          <div style={{ fontWeight: 500, marginTop: 4 }}>{payment.customer?.name || '-'}</div>
          <div style={{ fontSize: 12, color: '#98a4b3', marginTop: 2 }}>
            <FileTextOutlined style={{ marginRight: 4 }} />
            {payment.order?.code || '-'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 600, color: '#22a06b', fontSize: 16 }}>
            {formatPrice(payment.amount)}
          </div>
          <Tag color={payment.method === 'CASH' ? 'green' : 'blue'} style={{ marginTop: 4 }}>
            {payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
          </Tag>
        </div>
      </div>
      {payment.note && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#788492', fontStyle: 'italic' }}>
          {payment.note}
        </div>
      )}
    </Card>
  )

  const columns = [
    {
      title: 'Ngày',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      width: 150,
      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Mã đơn',
      dataIndex: 'order',
      key: 'order',
      width: 140,
      render: (order) => order?.code || '-',
    },
    {
      title: 'Khách hàng',
      dataIndex: 'customer',
      key: 'customer',
      render: (customer) => customer?.name || '-',
    },
    {
      title: 'Số tiền',
      dataIndex: 'amount',
      key: 'amount',
      width: 150,
      render: (val) => <span style={{ color: 'green', fontWeight: 'bold' }}>{formatPrice(val)}</span>,
    },
    {
      title: 'Hình thức',
      dataIndex: 'method',
      key: 'method',
      width: 120,
      render: (val) => (
        <Tag color={val === 'CASH' ? 'green' : 'blue'}>
          {val === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
        </Tag>
      ),
    },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      ellipsis: true,
    },
  ]

  // Calculate total
  const totalAmount = payments.reduce((sum, p) => sum + Number(p.amount), 0)

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
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Thanh toán</Title>
        <RangePicker
          value={dateRange}
          onChange={setDateRange}
          format="DD/MM/YYYY"
          style={{ width: isMobile ? '100%' : 'auto' }}
        />
      </div>

      {/* Stats Summary */}
      <div style={{
        marginBottom: 16,
        padding: isMobile ? 12 : 16,
        background: '#eef9fa',
        borderRadius: 8,
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        gap: isMobile ? 8 : 24,
      }}>
        <span style={{ fontSize: isMobile ? 13 : 14 }}>
          Tổng số: <strong style={{ color: '#134e52' }}>{pagination.total}</strong> giao dịch
        </span>
        <span style={{ fontSize: isMobile ? 13 : 14 }}>
          Tổng tiền: <strong style={{ color: '#22a06b' }}>{formatPrice(totalAmount)}</strong>
        </span>
      </div>

      {/* Content - Table or Cards */}
      {isMobile ? (
        <PullToRefresh onRefresh={handleRefresh} disabled={loading}>
          <div>
            {loading ? (
              <Card loading={true} />
            ) : (
              <>
                {payments.map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))}
                <LoadMoreButton
                  loading={loadingMore}
                  hasMore={hasMore}
                  onClick={handleLoadMore}
                  current={payments.length}
                  total={pagination.total}
                  itemName="giao dịch"
                />
              </>
            )}
          </div>
        </PullToRefresh>
      ) : (
        <Table
          dataSource={payments}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} giao dịch`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }))
              loadPayments(page, true)
            },
          }}
        />
      )}
    </div>
  )
}

export default PaymentList
