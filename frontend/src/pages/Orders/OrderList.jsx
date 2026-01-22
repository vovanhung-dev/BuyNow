import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Input, Space, Select, DatePicker, Tag, Typography, message } from 'antd'
import { PlusOutlined, SearchOutlined, EyeOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersAPI } from '../../services/api'

const { Title } = Typography
const { RangePicker } = DatePicker

const statusConfig = {
  PENDING: { color: 'orange', label: 'Mới tạo' },
  APPROVED: { color: 'blue', label: 'Đã duyệt' },
  COMPLETED: { color: 'green', label: 'Hoàn thành' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

const OrderList = () => {
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  useEffect(() => {
    loadOrders()
  }, [search, status, dateRange, pagination.current])

  const loadOrders = async () => {
    setLoading(true)
    try {
      const params = {
        search,
        status,
        page: pagination.current,
        limit: pagination.pageSize,
      }

      if (dateRange && dateRange[0] && dateRange[1]) {
        params.startDate = dateRange[0].format('YYYY-MM-DD')
        params.endDate = dateRange[1].format('YYYY-MM-DD')
      }

      const res = await ordersAPI.getAll(params)
      setOrders(res.data || [])
      setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }))
    } catch (error) {
      message.error('Lỗi tải danh sách đơn hàng')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  const columns = [
    { title: 'Mã đơn', dataIndex: 'code', key: 'code', width: 140 },
    {
      title: 'Ngày',
      dataIndex: 'orderDate',
      key: 'orderDate',
      width: 100,
      render: (val) => dayjs(val).format('DD/MM/YYYY'),
    },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName' },
    {
      title: 'Nhân viên',
      dataIndex: 'user',
      key: 'user',
      width: 120,
      render: (user) => user?.name || '-',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      render: formatPrice,
    },
    {
      title: 'Còn nợ',
      dataIndex: 'debtAmount',
      key: 'debtAmount',
      width: 120,
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
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Đơn hàng</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/orders/create')}>
          Tạo đơn hàng
        </Button>
      </div>

      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="Tìm mã đơn, tên KH..."
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 200 }}
          allowClear
        />
        <Select
          placeholder="Trạng thái"
          value={status}
          onChange={setStatus}
          style={{ width: 150 }}
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
        />
      </Space>

      <Table
        dataSource={orders}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} đơn hàng`,
          onChange: (page) => setPagination((prev) => ({ ...prev, current: page })),
        }}
      />
    </div>
  )
}

export default OrderList
