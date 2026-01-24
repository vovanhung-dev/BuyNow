import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Table, Tag, Button, Space, Typography, message, Popconfirm, Modal, InputNumber, Select, Grid, Spin
} from 'antd'
import {
  PrinterOutlined, CheckOutlined, CloseOutlined, DollarOutlined, ArrowLeftOutlined,
  ClockCircleOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined
} from '@ant-design/icons'
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
  const [submitting, setSubmitting] = useState(false)
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
    setSubmitting(true)
    try {
      await ordersAPI.updateStatus(id, 'APPROVED')
      message.success('Duyệt đơn hàng thành công')
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi duyệt đơn hàng')
    } finally {
      setSubmitting(false)
    }
  }

  const handleComplete = async () => {
    setSubmitting(true)
    try {
      await ordersAPI.updateStatus(id, 'COMPLETED')
      message.success('Hoàn thành đơn hàng')
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi cập nhật đơn hàng')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    setSubmitting(true)
    try {
      await ordersAPI.cancel(id)
      message.success('Hủy đơn hàng thành công')
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi hủy đơn hàng')
    } finally {
      setSubmitting(false)
    }
  }

  const handlePayment = async () => {
    setSubmitting(true)
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
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!order) {
    return null
  }

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
          <div style={{ fontWeight: 500, fontSize: 14 }}>{item.stt}. {item.productName}</div>
          <div style={{ fontSize: 13, color: '#788492', marginTop: 4 }}>
            {formatPrice(item.unitPrice)} × {item.quantity} {item.unit || ''}
          </div>
          {item.note && (
            <div style={{ fontSize: 12, color: '#faad14', marginTop: 4, fontStyle: 'italic' }}>
              {item.note}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', marginLeft: 12 }}>
          <div style={{ fontWeight: 600, color: '#2a9299', fontSize: 15 }}>{formatPrice(item.total)}</div>
        </div>
      </div>
    </div>
  )

  // Mobile Payment Card
  const PaymentCard = ({ payment }) => (
    <div style={{
      padding: '12px 0',
      borderBottom: '1px solid #f0f0f0',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 12, color: '#788492' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {dayjs(payment.paymentDate).format('DD/MM/YYYY HH:mm')}
          </div>
          <Tag color={payment.method === 'CASH' ? 'green' : 'blue'} style={{ marginTop: 6 }}>
            {payment.method === 'CASH' ? 'Tiền mặt' : 'Chuyển khoản'}
          </Tag>
          {payment.note && (
            <div style={{ fontSize: 12, color: '#788492', marginTop: 4 }}>
              {payment.note}
            </div>
          )}
        </div>
        <div style={{ fontWeight: 600, color: '#22a06b', fontSize: 15 }}>
          +{formatPrice(payment.amount)}
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

  // Check if we need to show action buttons
  const showApprove = order.status === 'PENDING' && canEdit
  const showComplete = order.status === 'APPROVED' && canEdit
  const showPayment = debtAmount > 0 && order.status !== 'CANCELLED'
  const showCancel = ['PENDING', 'APPROVED'].includes(order.status)
  const hasActions = showApprove || showComplete || showPayment || showCancel

  return (
    <div className="animate-fade-in" style={{
      paddingBottom: isMobile && hasActions ? 100 : 24,
      minHeight: isMobile ? '100vh' : 'auto'
    }}>
      {/* Header - Sticky on mobile */}
      <div className="no-print" style={{
        position: isMobile ? 'sticky' : 'relative',
        top: isMobile ? 0 : 'auto',
        zIndex: 10,
        background: '#fff',
        padding: isMobile ? '12px 0' : '0 0 16px 0',
        marginBottom: isMobile ? 0 : 16,
        borderBottom: isMobile ? '1px solid #f0f0f0' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/orders')}
              style={{
                minWidth: 40,
                height: isMobile ? 40 : 32,
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Title level={4} style={{ margin: 0, fontSize: isMobile ? 16 : 20 }}>
                  {order.code}
                </Title>
                <Tag color={statusConfig[order.status]?.color}>
                  {statusConfig[order.status]?.label}
                </Tag>
              </div>
              {isMobile && (
                <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
                  {dayjs(order.orderDate).format('DD/MM/YYYY')}
                </div>
              )}
            </div>
          </div>
          {!isMobile && (
            <Space wrap size={8}>
              {showApprove && (
                <Popconfirm title="Xác nhận duyệt đơn hàng?" onConfirm={handleApprove}>
                  <Button type="primary" icon={<CheckOutlined />} loading={submitting}>
                    Duyệt
                  </Button>
                </Popconfirm>
              )}
              {showComplete && (
                <Popconfirm title="Xác nhận hoàn thành đơn hàng?" onConfirm={handleComplete}>
                  <Button type="primary" icon={<CheckOutlined />} style={{ background: '#52c41a' }} loading={submitting}>
                    Hoàn thành
                  </Button>
                </Popconfirm>
              )}
              {showPayment && (
                <Button
                  icon={<DollarOutlined />}
                  onClick={() => {
                    setPaymentAmount(debtAmount)
                    setPaymentModalOpen(true)
                  }}
                >
                  Thanh toán
                </Button>
              )}
              {showCancel && (
                <Popconfirm title="Xác nhận hủy đơn hàng?" onConfirm={handleCancel}>
                  <Button danger icon={<CloseOutlined />} loading={submitting}>
                    Hủy đơn
                  </Button>
                </Popconfirm>
              )}
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                In
              </Button>
            </Space>
          )}
        </div>
      </div>

      <div className="print-invoice">
        {/* Print Header - Hidden on screen */}
        <div className="print-only" style={{ textAlign: 'center', marginBottom: 20, display: 'none' }}>
          <Title level={3} style={{ margin: 0 }}>NPP HÙNG THƯ</Title>
          <p>Điện thoại: 0865.888.128 - 09.1234.1256</p>
          <p>Địa chỉ: Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình</p>
          <Title level={4} style={{ marginTop: 16 }}>HÓA ĐƠN BÁN HÀNG</Title>
        </div>

        {/* Customer Info */}
        <Card
          style={{
            marginBottom: 16,
            border: isMobile ? 'none' : undefined,
            boxShadow: isMobile ? 'none' : undefined,
          }}
          bodyStyle={{ padding: isMobile ? '16px 0' : 24 }}
        >
          {isMobile ? (
            <div>
              {/* Date */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <ClockCircleOutlined style={{ color: '#788492' }} />
                <span style={{ color: '#788492' }}>Ngày tạo:</span>
                <span style={{ fontWeight: 500 }}>{dayjs(order.orderDate).format('DD/MM/YYYY')}</span>
              </div>

              {/* Customer Name */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Khách hàng</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#2d3640' }}>{order.customerName}</div>
              </div>

              {/* Phone */}
              {order.customerPhone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <PhoneOutlined style={{ color: '#2a9299' }} />
                  <a href={`tel:${order.customerPhone}`} style={{ color: '#2d3640' }}>
                    {order.customerPhone}
                  </a>
                </div>
              )}

              {/* Address */}
              {order.customerAddress && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12 }}>
                  <EnvironmentOutlined style={{ color: '#2a9299', marginTop: 2 }} />
                  <span style={{ color: '#5e6c7b', fontSize: 13 }}>{order.customerAddress}</span>
                </div>
              )}

              {/* Staff */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                <UserOutlined style={{ color: '#788492' }} />
                <span style={{ color: '#788492' }}>Nhân viên:</span>
                <span style={{ fontWeight: 500 }}>{order.user?.name}</span>
              </div>
            </div>
          ) : (
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Mã đơn">{order.code}</Descriptions.Item>
              <Descriptions.Item label="Ngày">
                {dayjs(order.orderDate).format('DD/MM/YYYY')}
              </Descriptions.Item>
              <Descriptions.Item label="Khách hàng">{order.customerName}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{order.customerPhone || '-'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{order.customerAddress || '-'}</Descriptions.Item>
              <Descriptions.Item label="Nhân viên">{order.user?.name}</Descriptions.Item>
            </Descriptions>
          )}
        </Card>

        {/* Order Items */}
        <Card
          title={<span style={{ fontSize: isMobile ? 14 : 16 }}>Chi tiết sản phẩm ({order.items.length})</span>}
          style={{
            marginBottom: 16,
            border: isMobile ? 'none' : undefined,
            boxShadow: isMobile ? 'none' : undefined,
          }}
          bodyStyle={{ padding: isMobile ? '0' : 24 }}
          headStyle={{ padding: isMobile ? '12px 0' : undefined, borderBottom: isMobile ? '1px solid #f0f0f0' : undefined }}
        >
          {isMobile ? (
            <>
              {order.items.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
              {/* Summary for Mobile */}
              <div style={{ marginTop: 16, padding: isMobile ? '16px 0 0 0' : 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#788492' }}>Tổng tiền hàng:</span>
                  <span>{formatPrice(order.subtotal)}</span>
                </div>
                {Number(order.discount) > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#788492' }}>Chiết khấu:</span>
                    <span style={{ color: '#ff4d4f' }}>-{formatPrice(order.discount)}</span>
                  </div>
                )}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: 8,
                  paddingTop: 8,
                  borderTop: '1px dashed #e8e8e8',
                  fontWeight: 600,
                  fontSize: 15,
                }}>
                  <span>Tổng thanh toán:</span>
                  <span style={{ color: '#134e52' }}>{formatPrice(order.total)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#788492' }}>Đã thanh toán:</span>
                  <span style={{ color: '#22a06b' }}>{formatPrice(order.paidAmount)}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: debtAmount > 0 ? '#ffedeb' : '#dcf7e9',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 16,
                  marginTop: 8,
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
                    <Table.Summary.Cell colSpan={5} align="right"><strong>Tổng tiền hàng:</strong></Table.Summary.Cell>
                    <Table.Summary.Cell>{formatPrice(order.subtotal)}</Table.Summary.Cell>
                    <Table.Summary.Cell />
                  </Table.Summary.Row>
                  {Number(order.discount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={5} align="right">Chiết khấu:</Table.Summary.Cell>
                      <Table.Summary.Cell>-{formatPrice(order.discount)}</Table.Summary.Cell>
                      <Table.Summary.Cell />
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right"><strong>Tổng thanh toán:</strong></Table.Summary.Cell>
                    <Table.Summary.Cell><strong style={{ color: '#1890ff' }}>{formatPrice(order.total)}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell />
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">Đã thanh toán:</Table.Summary.Cell>
                    <Table.Summary.Cell style={{ color: 'green' }}>{formatPrice(order.paidAmount)}</Table.Summary.Cell>
                    <Table.Summary.Cell />
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right"><strong>Còn nợ:</strong></Table.Summary.Cell>
                    <Table.Summary.Cell><strong style={{ color: debtAmount > 0 ? 'red' : 'green' }}>{formatPrice(order.debtAmount)}</strong></Table.Summary.Cell>
                    <Table.Summary.Cell />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          )}
        </Card>

        {/* Payment History */}
        {order.payments?.length > 0 && (
          <Card
            title={<span style={{ fontSize: isMobile ? 14 : 16 }}>Lịch sử thanh toán ({order.payments.length})</span>}
            className="no-print"
            style={{
              marginBottom: 16,
              border: isMobile ? 'none' : undefined,
              boxShadow: isMobile ? 'none' : undefined,
            }}
            bodyStyle={{ padding: isMobile ? '0' : 24 }}
            headStyle={{ padding: isMobile ? '12px 0' : undefined, borderBottom: isMobile ? '1px solid #f0f0f0' : undefined }}
          >
            {isMobile ? (
              order.payments.map((payment) => (
                <PaymentCard key={payment.id} payment={payment} />
              ))
            ) : (
              <Table
                dataSource={order.payments}
                columns={paymentColumns}
                rowKey="id"
                pagination={false}
                size="small"
              />
            )}
          </Card>
        )}

        {/* Note */}
        {order.note && (
          <Card
            title={<span style={{ fontSize: isMobile ? 14 : 16 }}>Ghi chú</span>}
            style={{
              marginBottom: 16,
              border: isMobile ? 'none' : undefined,
              boxShadow: isMobile ? 'none' : undefined,
            }}
            bodyStyle={{ padding: isMobile ? '16px 0' : 24 }}
            headStyle={{ padding: isMobile ? '12px 0' : undefined, borderBottom: isMobile ? '1px solid #f0f0f0' : undefined }}
          >
            <Text style={{ color: '#5e6c7b' }}>{order.note}</Text>
          </Card>
        )}
      </div>

      {/* Fixed Footer on Mobile */}
      {isMobile && hasActions && (
        <div className="no-print" style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: 8,
          zIndex: 100,
        }}>
          {showCancel && (
            <Popconfirm title="Xác nhận hủy đơn hàng?" onConfirm={handleCancel}>
              <Button danger style={{ height: 44 }} loading={submitting}>
                <CloseOutlined /> Hủy
              </Button>
            </Popconfirm>
          )}
          {showPayment && (
            <Button
              style={{ flex: 1, height: 44 }}
              onClick={() => {
                setPaymentAmount(debtAmount)
                setPaymentModalOpen(true)
              }}
            >
              <DollarOutlined /> Thanh toán
            </Button>
          )}
          {showApprove && (
            <Popconfirm title="Xác nhận duyệt đơn hàng?" onConfirm={handleApprove}>
              <Button type="primary" style={{ flex: 1, height: 44 }} loading={submitting}>
                <CheckOutlined /> Duyệt đơn
              </Button>
            </Popconfirm>
          )}
          {showComplete && (
            <Popconfirm title="Xác nhận hoàn thành đơn hàng?" onConfirm={handleComplete}>
              <Button type="primary" style={{ flex: 1, height: 44, background: '#52c41a' }} loading={submitting}>
                <CheckOutlined /> Hoàn thành
              </Button>
            </Popconfirm>
          )}
        </div>
      )}

      {/* Payment Modal */}
      <Modal
        title="Thanh toán"
        open={paymentModalOpen}
        onCancel={() => setPaymentModalOpen(false)}
        onOk={handlePayment}
        okText="Xác nhận"
        cancelText="Hủy"
        confirmLoading={submitting}
      >
        <Space direction="vertical" style={{ width: '100%' }} size={16}>
          <div style={{
            padding: 16,
            background: '#ffedeb',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>Còn nợ</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#de350b' }}>{formatPrice(debtAmount)}</div>
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Số tiền thanh toán</div>
            <InputNumber
              value={paymentAmount}
              onChange={setPaymentAmount}
              min={1}
              max={debtAmount}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val.replace(/\,/g, '')}
              style={{ width: '100%', height: 44 }}
              size="large"
            />
          </div>
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>Hình thức thanh toán</div>
            <Select
              value={paymentMethod}
              onChange={setPaymentMethod}
              style={{ width: '100%', height: 44 }}
              size="large"
            >
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
