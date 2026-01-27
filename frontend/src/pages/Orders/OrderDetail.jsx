import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card, Descriptions, Table, Tag, Button, Space, Typography, message, Popconfirm, Modal, InputNumber, Select, Grid, Spin, Checkbox, Input, Row, Col
} from 'antd'
import {
  PrinterOutlined, CheckOutlined, CloseOutlined, DollarOutlined, ArrowLeftOutlined,
  ClockCircleOutlined, UserOutlined, PhoneOutlined, EnvironmentOutlined, RollbackOutlined, ShoppingCartOutlined, CreditCardOutlined, FileTextOutlined, CopyOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { ordersAPI, paymentsAPI, returnsAPI } from '../../services/api'
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
  const [returnModalOpen, setReturnModalOpen] = useState(false)
  const [returnItems, setReturnItems] = useState([])
  const [returnReason, setReturnReason] = useState('')
  const [orderReturns, setOrderReturns] = useState([])
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    loadOrder()
  }, [id])

  const loadOrder = async () => {
    setLoading(true)
    try {
      const [orderRes, returnsRes] = await Promise.all([
        ordersAPI.getById(id),
        returnsAPI.getByOrder(id),
      ])
      setOrder(orderRes.data)
      setOrderReturns(returnsRes.data || [])
    } catch (error) {
      message.error('Lỗi tải đơn hàng')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  const openReturnModal = () => {
    // Initialize return items from order items
    const items = order.items.map(item => ({
      orderItemId: item.id,
      productId: item.productId,
      productName: item.productName,
      unit: item.unit,
      maxQuantity: item.quantity,
      quantity: 0,
      unitPrice: Number(item.unitPrice),
      selected: false,
    }))
    setReturnItems(items)
    setReturnReason('')
    setReturnModalOpen(true)
  }

  const handleReturnItemChange = (index, field, value) => {
    setReturnItems(prev => {
      const newItems = [...prev]
      newItems[index] = { ...newItems[index], [field]: value }
      if (field === 'selected' && !value) {
        newItems[index].quantity = 0
      }
      if (field === 'selected' && value && newItems[index].quantity === 0) {
        newItems[index].quantity = newItems[index].maxQuantity
      }
      return newItems
    })
  }

  const handleReturn = async () => {
    const selectedItems = returnItems.filter(item => item.selected && item.quantity > 0)

    if (selectedItems.length === 0) {
      message.warning('Vui lòng chọn sản phẩm cần trả')
      return
    }

    setSubmitting(true)
    try {
      const totalRefund = selectedItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)

      await returnsAPI.create({
        orderId: id,
        items: selectedItems.map(item => ({
          orderItemId: item.orderItemId,
          productId: item.productId,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        refundAmount: totalRefund,
        reason: returnReason,
      })

      message.success('Tạo phiếu trả hàng thành công')
      setReturnModalOpen(false)
      loadOrder()
    } catch (error) {
      message.error(error.message || 'Lỗi tạo phiếu trả hàng')
    } finally {
      setSubmitting(false)
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
  const showReturn = order.status === 'COMPLETED'
  const showCopy = order.status === 'CANCELLED'
  const hasActions = showApprove || showComplete || showPayment || showCancel || showReturn || showCopy

  const handleCopyOrder = () => {
    navigate('/orders/create', { state: { copyFrom: id } })
  }

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
              {showReturn && (
                <Button icon={<RollbackOutlined />} onClick={openReturnModal}>
                  Trả hàng
                </Button>
              )}
              {showCopy && (
                <Button icon={<CopyOutlined />} onClick={handleCopyOrder}>
                  Sao chép đơn
                </Button>
              )}
              <Button icon={<PrinterOutlined />} onClick={handlePrint}>
                In
              </Button>
            </Space>
          )}
        </div>
      </div>

      <div className="print-invoice">
        {/* Print Layout - Only visible when printing */}
        <div className="print-only invoice-print-layout">
          <div className="invoice-header">
            <div className="company-name">NPP HÙNG THƯ</div>
            <div className="company-contact">ĐT: 0865.888.128 - 09.1234.1256</div>
            <div className="company-contact">Số nhà 29 đường Lưu Cơ, phố Kim Đa, TP Ninh Bình</div>
          </div>

          <div className="invoice-title">HÓA ĐƠN BÁN HÀNG</div>
          <div className="invoice-code">
            Số: <strong>{order.code}</strong> | Ngày: <strong>{dayjs(order.orderDate).format('DD/MM/YYYY')}</strong>
          </div>

          <div className="customer-section">
            <div className="customer-row">
              <span className="customer-label">Khách hàng:</span>
              <span className="customer-value"><strong>{order.customerName}</strong></span>
            </div>
            <div className="customer-row">
              <span className="customer-label">Điện thoại:</span>
              <span className="customer-value">{order.customerPhone || '-'}</span>
            </div>
            <div className="customer-row">
              <span className="customer-label">Địa chỉ:</span>
              <span className="customer-value">{order.customerAddress || '-'}</span>
            </div>
          </div>

          <table className="products-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>STT</th>
                <th>Tên sản phẩm</th>
                <th style={{ width: '60px' }}>ĐVT</th>
                <th style={{ width: '50px' }}>SL</th>
                <th style={{ width: '100px' }}>Đơn giá</th>
                <th style={{ width: '110px' }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="text-center">{item.stt}</td>
                  <td>{item.productName}{item.note ? ` (${item.note})` : ''}</td>
                  <td className="text-center">{item.unit || '-'}</td>
                  <td className="text-center">{item.quantity}</td>
                  <td className="text-right">{Number(item.unitPrice).toLocaleString('vi-VN')}</td>
                  <td className="text-right">{Number(item.total).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="summary-section">
            <div className="summary-table">
              <div className="summary-row">
                <span>Tổng tiền hàng:</span>
                <span>{Number(order.subtotal).toLocaleString('vi-VN')} đ</span>
              </div>
              {Number(order.discount) > 0 && (
                <div className="summary-row">
                  <span>Chiết khấu:</span>
                  <span>-{Number(order.discount).toLocaleString('vi-VN')} đ</span>
                </div>
              )}
              <div className="summary-row total">
                <span>TỔNG CỘNG:</span>
                <span>{Number(order.total).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="summary-row">
                <span>Đã thanh toán:</span>
                <span>{Number(order.paidAmount).toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="summary-row debt">
                <span>Còn nợ:</span>
                <span>{Number(order.debtAmount).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>

          {order.note && (
            <div className="invoice-note">
              <span className="invoice-note-title">Ghi chú: </span>
              {order.note}
            </div>
          )}

          <div className="signatures">
            <div className="signature-box">
              <div className="signature-title">Người mua hàng</div>
              <div className="signature-name">(Ký, ghi rõ họ tên)</div>
            </div>
            <div className="signature-box">
              <div className="signature-title">Người bán hàng</div>
              <div className="signature-name">{order.user?.name}</div>
            </div>
          </div>

          <div className="invoice-footer">
            Cảm ơn quý khách đã mua hàng!
          </div>
        </div>

        {/* Desktop: 2 column layout | Mobile: single column */}
        {isMobile ? (
          /* Mobile Layout - Customer Info */
          <Card
            style={{ marginBottom: 16, border: 'none', boxShadow: 'none' }}
            bodyStyle={{ padding: '16px 0' }}
          >
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
          </Card>
        ) : (
          /* Desktop Layout - 2 columns */
          <Row gutter={24} style={{ marginBottom: 24 }}>
            {/* Left Column - Customer Info */}
            <Col span={14}>
              <Card
                title={
                  <Space>
                    <UserOutlined style={{ color: '#2a9299' }} />
                    <span>Thông tin khách hàng</span>
                  </Space>
                }
                style={{ height: '100%' }}
              >
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 20, fontWeight: 600, color: '#134e52', marginBottom: 4 }}>
                    {order.customerName}
                  </div>
                  <Tag color="blue" style={{ marginTop: 4 }}>
                    {order.customer?.customerGroup?.name || 'Khách lẻ'}
                  </Tag>
                </div>

                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <div style={{ color: '#788492', fontSize: 12, marginBottom: 4 }}>Điện thoại</div>
                    <div style={{ fontWeight: 500 }}>
                      {order.customerPhone ? (
                        <a href={`tel:${order.customerPhone}`} style={{ color: '#2d3640' }}>
                          <PhoneOutlined style={{ marginRight: 6, color: '#2a9299' }} />
                          {order.customerPhone}
                        </a>
                      ) : '-'}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ color: '#788492', fontSize: 12, marginBottom: 4 }}>Nhân viên bán hàng</div>
                    <div style={{ fontWeight: 500 }}>
                      <UserOutlined style={{ marginRight: 6, color: '#2a9299' }} />
                      {order.user?.name}
                    </div>
                  </Col>
                  <Col span={24}>
                    <div style={{ color: '#788492', fontSize: 12, marginBottom: 4 }}>Địa chỉ</div>
                    <div style={{ color: '#5e6c7b' }}>
                      <EnvironmentOutlined style={{ marginRight: 6, color: '#2a9299' }} />
                      {order.customerAddress || '-'}
                    </div>
                  </Col>
                </Row>
              </Card>
            </Col>

            {/* Right Column - Order Summary */}
            <Col span={10}>
              <Card
                title={
                  <Space>
                    <ShoppingCartOutlined style={{ color: '#2a9299' }} />
                    <span>Tổng quan đơn hàng</span>
                  </Space>
                }
                style={{ height: '100%' }}
              >
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <ClockCircleOutlined style={{ color: '#788492' }} />
                    <span style={{ color: '#788492' }}>Ngày tạo:</span>
                    <span style={{ fontWeight: 500 }}>{dayjs(order.orderDate).format('DD/MM/YYYY HH:mm')}</span>
                  </div>
                </div>

                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#788492' }}>Tổng tiền hàng:</span>
                    <span style={{ fontWeight: 500 }}>{formatPrice(order.subtotal)}</span>
                  </div>
                  {Number(order.discount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: '#788492' }}>Chiết khấu:</span>
                      <span style={{ color: '#ff4d4f', fontWeight: 500 }}>-{formatPrice(order.discount)}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px dashed #e8e8e8', marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>Tổng thanh toán:</span>
                    <span style={{ fontWeight: 700, color: '#134e52', fontSize: 16 }}>{formatPrice(order.total)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ color: '#788492' }}>Đã thanh toán:</span>
                    <span style={{ color: '#22a06b', fontWeight: 500 }}>{formatPrice(order.paidAmount)}</span>
                  </div>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  background: debtAmount > 0 ? '#ffedeb' : '#dcf7e9',
                  borderRadius: 8,
                  marginTop: 12,
                }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    <CreditCardOutlined style={{ marginRight: 8 }} />
                    Còn nợ:
                  </span>
                  <span style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: debtAmount > 0 ? '#de350b' : '#22a06b'
                  }}>
                    {formatPrice(order.debtAmount)}
                  </span>
                </div>
              </Card>
            </Col>
          </Row>
        )}

        {/* Order Items */}
        <Card
          title={
            <Space>
              {!isMobile && <ShoppingCartOutlined style={{ color: '#2a9299' }} />}
              <span style={{ fontSize: isMobile ? 14 : 16 }}>Chi tiết sản phẩm ({order.items.length})</span>
            </Space>
          }
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
              <div style={{ marginTop: 16, padding: '16px 0 0 0' }}>
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
              size="middle"
              bordered
              style={{ marginBottom: 0 }}
            />
          )}
        </Card>

        {/* Desktop: 2-column layout for Payment & Return History */}
        {!isMobile && (order.payments?.length > 0 || orderReturns?.length > 0) && (
          <Row gutter={24} className="no-print">
            {/* Payment History */}
            {order.payments?.length > 0 && (
              <Col span={orderReturns?.length > 0 ? 12 : 24}>
                <Card
                  title={
                    <Space>
                      <DollarOutlined style={{ color: '#22a06b' }} />
                      <span>Lịch sử thanh toán ({order.payments.length})</span>
                    </Space>
                  }
                  style={{ marginBottom: 24, height: '100%' }}
                >
                  <Table
                    dataSource={order.payments}
                    columns={paymentColumns}
                    rowKey="id"
                    pagination={false}
                    size="small"
                  />
                </Card>
              </Col>
            )}

            {/* Return History */}
            {orderReturns?.length > 0 && (
              <Col span={order.payments?.length > 0 ? 12 : 24}>
                <Card
                  title={
                    <Space>
                      <RollbackOutlined style={{ color: '#de350b' }} />
                      <span>Lịch sử trả hàng ({orderReturns.length})</span>
                    </Space>
                  }
                  style={{ marginBottom: 24, height: '100%' }}
                >
                  {orderReturns.map((ret) => (
                    <div
                      key={ret.id}
                      style={{
                        padding: '12px 16px',
                        background: '#fef7f6',
                        borderRadius: 8,
                        marginBottom: 12,
                        border: '1px solid #ffedeb',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: '#134e52' }}>{ret.code}</div>
                          <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
                            <ClockCircleOutlined style={{ marginRight: 4 }} />
                            {dayjs(ret.createdAt).format('DD/MM/YYYY HH:mm')}
                            {ret.user?.name && <span> • {ret.user.name}</span>}
                          </div>
                          {ret.reason && (
                            <div style={{ fontSize: 12, color: '#faad14', marginTop: 4, fontStyle: 'italic' }}>
                              Lý do: {ret.reason}
                            </div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: '#de350b', fontWeight: 600, fontSize: 15 }}>
                            -{formatPrice(ret.totalAmount)}
                          </div>
                          <Tag color="red" style={{ marginTop: 4 }}>
                            {ret.items?.length || ret._count?.items || 0} sản phẩm
                          </Tag>
                        </div>
                      </div>
                      {ret.items?.length > 0 && (
                        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #e8e8e8' }}>
                          {ret.items.map((item, idx) => (
                            <div key={idx} style={{ fontSize: 13, color: '#5e6c7b', marginBottom: 4, display: 'flex', justifyContent: 'space-between' }}>
                              <span>• {item.productName} ({item.quantity} {item.unit || ''})</span>
                              <span>{formatPrice(item.total)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </Card>
              </Col>
            )}
          </Row>
        )}

        {/* Mobile: Payment History */}
        {isMobile && order.payments?.length > 0 && (
          <Card
            title={<span style={{ fontSize: 14 }}>Lịch sử thanh toán ({order.payments.length})</span>}
            className="no-print"
            style={{ marginBottom: 16, border: 'none', boxShadow: 'none' }}
            bodyStyle={{ padding: '0' }}
            headStyle={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
          >
            {order.payments.map((payment) => (
              <PaymentCard key={payment.id} payment={payment} />
            ))}
          </Card>
        )}

        {/* Mobile: Return History */}
        {isMobile && orderReturns?.length > 0 && (
          <Card
            title={<span style={{ fontSize: 14 }}>Lịch sử trả hàng ({orderReturns.length})</span>}
            className="no-print"
            style={{ marginBottom: 16, border: 'none', boxShadow: 'none' }}
            bodyStyle={{ padding: '0' }}
            headStyle={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}
          >
            {orderReturns.map((ret) => (
              <div
                key={ret.id}
                style={{
                  padding: '12px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#134e52' }}>{ret.code}</div>
                    <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
                      <ClockCircleOutlined style={{ marginRight: 4 }} />
                      {dayjs(ret.createdAt).format('DD/MM/YYYY HH:mm')}
                    </div>
                    {ret.reason && (
                      <div style={{ fontSize: 12, color: '#faad14', marginTop: 4, fontStyle: 'italic' }}>
                        {ret.reason}
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#de350b', fontWeight: 600 }}>
                      -{formatPrice(ret.totalAmount)}
                    </div>
                    <div style={{ fontSize: 12, color: '#788492' }}>
                      {ret.items?.length || ret._count?.items || 0} sản phẩm
                    </div>
                  </div>
                </div>
                {ret.items?.length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed #e8e8e8' }}>
                    {ret.items.map((item, idx) => (
                      <div key={idx} style={{ fontSize: 13, color: '#5e6c7b', marginBottom: 4 }}>
                        • {item.productName}: {item.quantity} {item.unit || ''} × {formatPrice(item.unitPrice)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </Card>
        )}

        {/* Note */}
        {order.note && (
          <Card
            title={
              isMobile ? (
                <span style={{ fontSize: 14 }}>Ghi chú</span>
              ) : (
                <Space>
                  <FileTextOutlined style={{ color: '#faad14' }} />
                  <span>Ghi chú đơn hàng</span>
                </Space>
              )
            }
            style={{
              marginBottom: 16,
              border: isMobile ? 'none' : undefined,
              boxShadow: isMobile ? 'none' : undefined,
            }}
            bodyStyle={{ padding: isMobile ? '16px 0' : 24 }}
            headStyle={{ padding: isMobile ? '12px 0' : undefined, borderBottom: isMobile ? '1px solid #f0f0f0' : undefined }}
          >
            <Text style={{ color: '#5e6c7b', whiteSpace: 'pre-wrap' }}>{order.note}</Text>
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
          {showReturn && (
            <Button style={{ flex: 1, height: 44 }} onClick={openReturnModal}>
              <RollbackOutlined /> Trả hàng
            </Button>
          )}
          {showCopy && (
            <Button type="primary" style={{ flex: 1, height: 44 }} onClick={handleCopyOrder}>
              <CopyOutlined /> Sao chép đơn
            </Button>
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

      {/* Return Modal */}
      <Modal
        title="Trả hàng"
        open={returnModalOpen}
        onCancel={() => setReturnModalOpen(false)}
        onOk={handleReturn}
        okText="Xác nhận trả hàng"
        cancelText="Hủy"
        confirmLoading={submitting}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 12 }}>Chọn sản phẩm trả:</div>
          {returnItems.map((item, index) => (
            <div
              key={item.orderItemId}
              style={{
                padding: 12,
                background: item.selected ? '#eef9fa' : '#f9fafb',
                borderRadius: 8,
                marginBottom: 8,
                border: item.selected ? '1px solid #2a9299' : '1px solid #e8e8e8',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Checkbox
                  checked={item.selected}
                  onChange={(e) => handleReturnItemChange(index, 'selected', e.target.checked)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{item.productName}</div>
                  <div style={{ fontSize: 12, color: '#788492' }}>
                    Đã mua: {item.maxQuantity} {item.unit || ''} × {formatPrice(item.unitPrice)}
                  </div>
                </div>
                {item.selected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 13, color: '#788492' }}>Trả:</span>
                    <InputNumber
                      value={item.quantity}
                      onChange={(val) => handleReturnItemChange(index, 'quantity', val)}
                      min={1}
                      max={item.maxQuantity}
                      style={{ width: 70 }}
                    />
                  </div>
                )}
              </div>
              {item.selected && item.quantity > 0 && (
                <div style={{ marginTop: 8, textAlign: 'right', color: '#de350b', fontWeight: 500 }}>
                  Hoàn: {formatPrice(item.unitPrice * item.quantity)}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 500, marginBottom: 8 }}>Lý do trả hàng:</div>
          <Input.TextArea
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            placeholder="Nhập lý do trả hàng..."
            rows={2}
          />
        </div>

        {returnItems.some(item => item.selected && item.quantity > 0) && (
          <div style={{
            padding: 16,
            background: '#ffedeb',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 12, color: '#788492', marginBottom: 4 }}>Tổng tiền hoàn</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#de350b' }}>
              {formatPrice(returnItems.filter(i => i.selected && i.quantity > 0).reduce((sum, i) => sum + i.unitPrice * i.quantity, 0))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default OrderDetail
