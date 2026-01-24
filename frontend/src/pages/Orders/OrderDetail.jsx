import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Table, Tag, Button, Space, Typography, message, Popconfirm, Modal, InputNumber, Select, Grid
} from 'antd'
import { PrinterOutlined, CheckOutlined, CloseOutlined, DollarOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersAPI, paymentsAPI } from '../../services/api'
import { useAuthStore } from '../../store'

const { Title, Text } = Typography
const { useBreakpoint } = Grid

const statusConfig = {
  PENDING: { color: 'orange', label: 'Mới tạo' },
  APPROVED: { color: 'blue', label: 'Đã duyệt' },
  COMPLETED: { color: 'green', label: 'Hoàn thành' },
  CANCELLED: { color: 'red', label: 'Đã hủy' },
}

const OrderDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [paymentModalOpen, setPaymentModalOpen] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState(0)
  const [paymentMethod, setPaymentMethod] = useState('CASH')
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    loadOrder()
  }, [id])

  const loadOrder = async () => {
    setLoading(true)
    try {
      const res = await ordersAPI.getById(id)
      setOrder(res.data)
    } catch (error) {
      message.error('Lỗi tải đơn hàng')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      await ordersAPI.updateStatus(id, 'APPROVED')
      message.success('Duyệt đơn hàng thành công')
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi duyệt đơn hàng')
    }
  }

  const handleComplete = async () => {
    try {
      await ordersAPI.updateStatus(id, 'COMPLETED')
      message.success('Hoàn thành đơn hàng')
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi cập nhật đơn hàng')
    }
  }

  const handleCancel = async () => {
    try {
      await ordersAPI.cancel(id)
      message.success('Hủy đơn hàng thành công')
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi hủy đơn hàng')
    }
  }

  const handlePayment = async () => {
    try {
      await paymentsAPI.create({
        orderId: id,
        amount: paymentAmount,
        method: paymentMethod,
      })
      message.success('Ghi nhận thanh toán thành công')
      setPaymentModalOpen(false)
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi thanh toán')
    }
  }

  const handlePrint = () => {
    window.print()
  }

  if (loading || !order) {
    return <div>Đang tải...</div>
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'
  const canEdit = ['ADMIN', 'MANAGER'].includes(user?.role)
  const debtAmount = Number(order.debtAmount)

  // Mobile Item Card
  const ItemCard = ({ item }) => (
    <div style={{
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500 }}>{item.stt}. {item.productName}</div>
          <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
            {item.unit || '—'} × {item.quantity}
          </div>
          {item.note && (
            <div style={{ fontSize: 12, color: '#faad14', marginTop: 4, fontStyle: 'italic' }}>
              📝 {item.note}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, color: '#788492' }}>{formatPrice(item.unitPrice)}</div>
          <div style={{ fontWeight: 600, color: '#2a9299' }}>{formatPrice(item.total)}</div>
        </div>
      </div>
    </div>
  )

  const itemColumns = [
    { title: 'STT', dataIndex: 'stt', key: 'stt', width: 50 },
    { title: 'Tên sản phẩm', dataIndex: 'productName', key: 'productName' },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', width: 120, render: formatPrice },
    { title: 'Thành tiền', dataIndex: 'total', key: 'total', width: 120, render: formatPrice },
    {
      title: 'Ghi chú',
      dataIndex: 'note',
      key: 'note',
      width: 150,
      render: (val) => val ? <span style={{ color: '#faad14', fontStyle: 'italic' }}>{val}</span> : '-',
    },
  ]

  const paymentColumns = [
    {
      title: 'Ngày',
      dataIndex: 'paymentDate',
      key: 'paymentDate',
      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    { title: 'Số tiền', dataIndex: 'amount', key: 'amount', render: formatPrice },
    {
      title: 'Hình thức',
      dataIndex: 'method',
      key: 'method',
      render: (val) => val === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản',
    },
    { title: 'Ghi chú', dataIndex: 'note', key: 'note' },
  ]

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="no-print" style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/orders')} />
          <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : 20 }}>
            {order.code}
          </Title>
          <Tag color={statusConfig[order.status]?.color}>
            {statusConfig[order.status]?.label}
          </Tag>
        </div>
        <Space wrap size={8}>
          {order.status === 'PENDING' && canEdit && (
            <Popconfirm title="Xác nhận duyệt đơn hàng?" onConfirm={handleApprove}>
              <Button type="primary" icon={<CheckOutlined />} size={isMobile ? 'small' : 'middle'}>
                Duyệt
              </Button>
            </Popconfirm>
          )}
          {order.status === 'APPROVED' && canEdit && (
            <Popconfirm title="Xác nhận hoàn thành đơn hàng?" onConfirm={handleComplete}>
              <Button type="primary" icon={<CheckOutlined />} style={{ background: '#52c41a' }} size={isMobile ? 'small' : 'middle'}>
                Hoàn thành
              </Button>
            </Popconfirm>
          )}
          {debtAmount > 0 && order.status !== 'CANCELLED' && (
            <Button
              icon={<DollarOutlined />}
              onClick={() => {
                setPaymentAmount(debtAmount)
                setPaymentModalOpen(true)
              }}
              size={isMobile ? 'small' : 'middle'}
            >
              Thanh toán
            </Button>
          )}
          {order.status === 'PENDING' && (
            <Popconfirm title="Xác nhận hủy đơn hàng?" onConfirm={handleCancel}>
              <Button danger icon={<CloseOutlined />} size={isMobile ? 'small' : 'middle'}>
                Hủy đơn
              </Button>
            </Popconfirm>
          )}
          <Button icon={<PrinterOutlined />} onClick={handlePrint} size={isMobile ? 'small' : 'middle'}>
            In
          </Button>
        </Space>
      </div>

      <div className="print-invoice">
        <div className="header" style={{ textAlign: 'center', marginBottom: 20 }}>
          <Title level={3} style={{ margin: 0 }}>NPP HÙNG THƯ</Title>
          <p>Điện thoại: 0865.888.128 - 09.1234.1256</p>
          <p>Địa chỉ: Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình</p>
          <Title level={4} style={{ marginTop: 16 }}>HÓA ĐƠN BÁN HÀNG</Title>
        </div>

        <Card style={{ marginBottom: 16 }} size={isMobile ? 'small' : 'default'}>
          <Descriptions column={isMobile ? 1 : 2} size="small">
            <Descriptions.Item label="Mã đơn">{order.code}</Descriptions.Item>
            <Descriptions.Item label="Ngày">
              {dayjs(order.orderDate).format('DD/MM/YYYY')}
            </Descriptions.Item>
            <Descriptions.Item label="Khách hàng">{order.customerName}</Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{order.customerPhone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ" span={isMobile ? 1 : 2}>{order.customerAddress || '-'}</Descriptions.Item>
            <Descriptions.Item label="Nhân viên">{order.user?.name}</Descriptions.Item>
          </Descriptions>
        </Card>

        <Card title="Chi tiết sản phẩm" style={{ marginBottom: 16 }} size={isMobile ? 'small' : 'default'}>
          {isMobile ? (
            <>
              {order.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
              {/* Summary for Mobile */}
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '2px solid #f0f0f0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Tổng tiền hàng:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span>Chiết khấu:</span>
                    <span>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontWeight: 600 }}>
                  <span>Tổng thanh toán:</span>
                  <span style={{ color: '#2a9299' }}>{formatPrice(order.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Đã thanh toán:</span>
                  <span style={{ color: '#22a06b' }}>{formatPrice(order.paidAmount)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px',
                  background: debtAmount > 0 ? '#ffedeb' : '#dcf7e9',
                  borderRadius: 8,
                  fontWeight: 600,
                }}>
                  <span>Còn nợ:</span>
                  <span style={{ color: debtAmount > 0 ? '#de350b' : '#22a06b' }}>
                    {formatPrice(order.debtAmount)}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <Table
              dataSource={order.items}
              columns={itemColumns}
              rowKey="id"
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={6} align="right"><strong>Tổng tiền hàng:</strong></Table.Summary.Cell>
                    <Table.Summary.Cell>{formatPrice(order.subtotal)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                  {Number(order.discount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={6} align="right">Chiết khấu:</Table.Summary.Cell>
                      <Table.Summary.Cell>-{formatPrice(order.discount)}</Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={6} align="right"><strong>Tổng thanh toán:</strong></Table.Summary.Cell>
                    <Table.Summary.Cell><strong style={{ color: '#1890ff' }}>{formatPrice(order.total)}</strong></Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={6} align="right">Đã thanh toán:</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ color: 'green' }}>{formatPrice(order.paidAmount)}</Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={6} align="right"><strong>Còn nợ:</strong></Table.Summary.Cell>
                    <Table.Summary.Cell><strong style={{ color: debtAmount > 0 ? 'red' : 'green' }}>{formatPrice(order.debtAmount)}</strong></Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          )}
        </Card>

        {order.payments?.length > 0 && (
          <Card title="Lịch sử thanh toán" className="no-print">
            <Table
              dataSource={order.payments}
              columns={paymentColumns}
              rowKey="id"
              pagination={false}
              size="small"
            />
          </Card>
        )}

        {order.note && (
          <Card title="Ghi chú" style={{ marginTop: 16 }}>
            <Text>{order.note}</Text>
          </Card>
        )}
      </div>

      <Modal
        title="Thanh toán"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={handlePayment}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text>Còn nợ: </Text>
            <Text strong style={{ color: 'red' }}>{formatPrice(debtAmount)}</Text>
          </div>
          <div>
            <Text>Số tiền thanh toán:</Text>
            <InputNumber
              value={paymentAmount}
              onChange={setPaymentAmount}
              min={1}
              max={debtAmount}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val.replace(/\,/g, '')}
              style={{ width: '100%', marginTop: 8 }}
            />
          </div>
          <div>
            <Text>Hình thức:</Text>
            <Select value={paymentMethod} onChange={setPaymentMethod} style={{ width: '100%', marginTop: 8 }}>
              <Select.Option value="CASH">Tiền mặt</Select.Option>
              <Select.Option value="BANK_TRANSFER">Chuyển khoản</Select.Option>
            </Select>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default OrderDetail
