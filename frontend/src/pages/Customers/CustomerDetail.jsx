import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Typography, message, Grid, Descriptions, Tag, Spin } from 'antd'
import { ArrowLeftOutlined, EditOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { customersAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid

const getGroupColor = (groupCode) => {
  const colors = {
    DLN: { bg: '#fff7d6', text: '#e5a100' },
    DLV: { bg: '#e6f2ff', text: '#0065ff' },
    dailylon: { bg: '#dcf7e9', text: '#22a06b' },
  }
  return colors[groupCode] || { bg: '#f4f5f7', text: '#5e6c7b' }
}

const CustomerDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [customer, setCustomer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCustomer()
  }, [id])

  const loadCustomer = async () => {
    setLoading(true)
    try {
      const res = await customersAPI.getById(id)
      setCustomer(res.data)
    } catch (error) {
      message.error('Lỗi tải thông tin khách hàng')
      navigate('/customers')
    } finally {
      setLoading(false)
    }
  }

  const formatPrice = (val) => Number(val || 0).toLocaleString('vi-VN') + ' đ'

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!customer) {
    return null
  }

  const color = getGroupColor(customer.customerGroup?.code)
  const debt = Number(customer.totalDebt || 0)

  return (
    <div className="animate-fade-in" style={{
      paddingBottom: isMobile ? 100 : 24,
      minHeight: isMobile ? '100vh' : 'auto'
    }}>
      {/* Header - Sticky on mobile */}
      <div style={{
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
              onClick={() => navigate('/customers')}
              size={isMobile ? 'middle' : 'middle'}
              style={{
                minWidth: 40,
                height: isMobile ? 40 : 32,
              }}
            />
            <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
              Chi tiết khách hàng
            </Title>
          </div>
          {!isMobile && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/customers/${id}/edit`)}
            >
              Chỉnh sửa
            </Button>
          )}
        </div>
      </div>

      {/* Customer Info Card */}
      <Card
        style={{
          maxWidth: isMobile ? '100%' : 600,
          border: isMobile ? 'none' : undefined,
          boxShadow: isMobile ? 'none' : undefined,
          marginBottom: 16,
        }}
        bodyStyle={{
          padding: isMobile ? '16px 0' : 24,
        }}
      >
        {/* Customer Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Mã KH</div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 14,
              color: '#134e52',
              fontWeight: 600,
            }}>
              {customer.code}
            </div>
          </div>
          {customer.customerGroup && (
            <Tag style={{
              background: color.bg,
              color: color.text,
              border: 'none',
              borderRadius: 20,
              padding: '4px 12px',
              fontWeight: 500,
            }}>
              {customer.customerGroup.name}
            </Tag>
          )}
        </div>

        {/* Customer Name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Tên khách hàng</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#2d3640' }}>
            {customer.name}
          </div>
        </div>

        {/* Contact Info */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 8 }}>Liên hệ</div>
          {customer.phone ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <PhoneOutlined style={{ color: '#2a9299' }} />
              <a href={`tel:${customer.phone}`} style={{ color: '#2d3640', fontSize: 15 }}>
                {customer.phone}
              </a>
            </div>
          ) : (
            <div style={{ color: '#c1c9d2' }}>Chưa có số điện thoại</div>
          )}
        </div>

        {/* Address */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 8 }}>Địa chỉ</div>
          {customer.address || customer.ward || customer.district ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <EnvironmentOutlined style={{ color: '#2a9299', marginTop: 4 }} />
              <div style={{ color: '#5e6c7b', fontSize: 14, lineHeight: 1.5 }}>
                {[customer.address, customer.ward, customer.district].filter(Boolean).join(', ')}
              </div>
            </div>
          ) : (
            <div style={{ color: '#c1c9d2' }}>Chưa có địa chỉ</div>
          )}
        </div>

        {/* Debt */}
        <div style={{
          padding: 16,
          background: debt > 0 ? '#ffedeb' : '#dcf7e9',
          borderRadius: 8,
        }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Công nợ hiện tại</div>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: debt > 0 ? '#de350b' : '#22a06b',
          }}>
            {formatPrice(debt)}
          </div>
        </div>
      </Card>

      {/* Fixed Footer on Mobile */}
      {isMobile && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          background: '#fff',
          borderTop: '1px solid #f0f0f0',
          boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: 12,
          zIndex: 100,
        }}>
          <Button
            onClick={() => navigate('/customers')}
            style={{ flex: 1, height: 48 }}
          >
            Quay lại
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/customers/${id}/edit`)}
            style={{ flex: 2, height: 48 }}
          >
            Chỉnh sửa
          </Button>
        </div>
      )}
    </div>
  )
}

export default CustomerDetail
