import { useEffect, useState } from 'react'
import { Table, DatePicker, Space, Typography, message, Tag } from 'antd'
import dayjs from 'dayjs'
import { paymentsAPI } from '../../services/api'

const { Title } = Typography
const { RangePicker } = DatePicker

const PaymentList = () => {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(false)
  const [dateRange, setDateRange] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  useEffect(() => {
    loadPayments()
  }, [dateRange, pagination.current])

  const loadPayments = async () => {
    setLoading(true)
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const res = await paymentsAPI.getAll(params)
      setPayments(res.data || [])
      setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }))
    } catch (error) {
      message.error('Lỗi tải danh sách thanh toán')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Thanh toán</Title>
        <Space>
          <RangePicker
            value={dateRange}
            onChange={setDateRange}
            format="DD/MM/YYYY"
          />
        </Space>
      </div>

      <div style={{ marginBottom: 16, padding: 16, background: '#f0f5ff', borderRadius: 8 }}>
        <Space size="large">
          <span>Tổng số: <strong>{pagination.total}</strong> giao dịch</span>
          <span>Tổng tiền: <strong style={{ color: 'green' }}>{formatPrice(totalAmount)}</strong></span>
        </Space>
      </div>

      <Table
        dataSource={payments}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} giao dịch`,
          onChange: (page) => setPagination((prev) => ({ ...prev, current: page })),
        }}
      />
    </div>
  )
}

export default PaymentList
