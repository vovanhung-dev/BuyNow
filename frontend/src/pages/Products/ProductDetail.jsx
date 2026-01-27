import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Typography, message, Grid, Tag, Spin } from 'antd'
import { ArrowLeftOutlined, EditOutlined, WarningOutlined } from '@ant-design/icons'
import { productsAPI } from '../../services/api'
import { useAuthStore } from '../../store'

const { Title } = Typography
const { useBreakpoint } = Grid

const ProductDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  useEffect(() => {
    loadProduct()
  }, [id])

  const loadProduct = async () => {
    setLoading(true)
    try {
      const res = await productsAPI.getById(id)
      setProduct(res.data)
    } catch (error) {
      message.error('Lỗi tải thông tin sản phẩm')
      navigate('/products')
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

  if (!product) {
    return null
  }

  const isLowStock = product.stock <= product.minStock

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
              onClick={() => navigate('/products')}
              size={isMobile ? 'middle' : 'middle'}
              style={{
                minWidth: 40,
                height: isMobile ? 40 : 32,
              }}
            />
            <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 20 }}>
              Chi tiết sản phẩm
            </Title>
          </div>
          {!isMobile && (
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={() => navigate(`/products/${id}/edit`)}
            >
              Chỉnh sửa
            </Button>
          )}
        </div>
      </div>

      {/* Product Info Card */}
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
        {/* Product Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: 20,
          paddingBottom: 16,
          borderBottom: '1px solid #f0f0f0'
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Mã SKU</div>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 14,
              color: '#134e52',
              fontWeight: 600,
            }}>
              {product.sku}
            </div>
          </div>
          <Tag color={product.active ? 'green' : 'red'}>
            {product.active ? 'Hoạt động' : 'Ngừng'}
          </Tag>
        </div>

        {/* Product Name */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Tên sản phẩm</div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#2d3640' }}>
            {product.name}
          </div>
        </div>

        {/* Unit */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Đơn vị tính</div>
          <div style={{ fontSize: 15, color: '#5e6c7b' }}>
            {product.unit || '—'}
          </div>
        </div>

        {/* Import Price - Only for ADMIN */}
        {isAdmin && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: '#d46b08', marginBottom: 12 }}>Giá nhập (Chỉ Admin)</div>
            <div style={{
              padding: 16,
              background: '#fff7e6',
              border: '1px solid #ffd591',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#d46b08', marginBottom: 4 }}>Giá nhập hàng</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#d46b08' }}>
                {formatPrice(product.importPrice)}
              </div>
            </div>
          </div>
        )}

        {/* Price Grid */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: '#788492', marginBottom: 12 }}>Bảng giá bán</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}>
            <div style={{
              padding: 12,
              background: '#f9fafb',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Giá bán buôn</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2a9299' }}>
                {formatPrice(product.wholesalePrice)}
              </div>
            </div>
            <div style={{
              padding: 12,
              background: '#f9fafb',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Giá ĐL vừa</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2a9299' }}>
                {formatPrice(product.mediumDealerPrice)}
              </div>
            </div>
            <div style={{
              padding: 12,
              background: '#f9fafb',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Giá ĐL lớn</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#2a9299' }}>
                {formatPrice(product.largeDealerPrice)}
              </div>
            </div>
            <div style={{
              padding: 12,
              background: '#eef9fa',
              borderRadius: 8,
              textAlign: 'center',
            }}>
              <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Giá bán lẻ</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#134e52' }}>
                {formatPrice(product.retailPrice)}
              </div>
            </div>
          </div>
        </div>

        {/* Stock */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
        }}>
          <div style={{
            padding: 16,
            background: isLowStock ? '#ffedeb' : '#dcf7e9',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Tồn kho</div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: isLowStock ? '#de350b' : '#22a06b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}>
              {product.stock}
              {isLowStock && <WarningOutlined style={{ color: '#faad14', fontSize: 18 }} />}
            </div>
          </div>
          <div style={{
            padding: 16,
            background: '#f9fafb',
            borderRadius: 8,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 11, color: '#788492', marginBottom: 4 }}>Tồn tối thiểu</div>
            <div style={{
              fontSize: 24,
              fontWeight: 700,
              color: '#5e6c7b',
            }}>
              {product.minStock}
            </div>
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
            onClick={() => navigate('/products')}
            style={{ flex: 1, height: 48 }}
          >
            Quay lại
          </Button>
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => navigate(`/products/${id}/edit`)}
            style={{ flex: 2, height: 48 }}
          >
            Chỉnh sửa
          </Button>
        </div>
      )}
    </div>
  )
}

export default ProductDetail
