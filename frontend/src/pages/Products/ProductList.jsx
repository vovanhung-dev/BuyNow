import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Button, Input, Space, message,
  Typography, Tag, Popconfirm, Card, Grid
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { productsAPI } from '../../services/api'
import { useAuthStore } from '../../store'
import PullToRefresh from '../../components/common/PullToRefresh'
import LoadMoreButton from '../../components/common/LoadMoreButton'

const { Title } = Typography
const { useBreakpoint } = Grid

const ProductList = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const screens = useBreakpoint()
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'ADMIN'

  const isMobile = !screens.md

  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
    setProducts([])
    loadProducts(1, true)
  }, [search])

  const loadProducts = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const res = await productsAPI.getAll({
        search,
        page,
        limit: pagination.pageSize,
      })

      const newData = res.data || []

      if (reset || page === 1) {
        setProducts(newData)
      } else {
        setProducts(prev => [...prev, ...newData])
      }

      setPagination(prev => ({
        ...prev,
        current: page,
        total: res.pagination?.total || 0
      }))
    } catch (error) {
      message.error('Lỗi tải danh sách sản phẩm')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, pagination.pageSize])

  const handleRefresh = useCallback(async () => {
    await loadProducts(1, true)
  }, [loadProducts])

  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.current + 1
    loadProducts(nextPage, false)
  }, [pagination.current, loadProducts])

  const hasMore = products.length < pagination.total

  const handleCreate = () => {
    navigate('/products/create')
  }

  const handleEdit = (record) => {
    navigate(`/products/${record.id}/edit`)
  }

  const handleView = (record) => {
    navigate(`/products/${record.id}`)
  }

  const handleDelete = async (id) => {
    try {
      await productsAPI.delete(id)
      message.success('Xóa sản phẩm thành công')
      loadProducts(1, true)
    } catch (error) {
      message.error(error.message || 'Lỗi xóa sản phẩm')
    }
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 110, fixed: 'left' },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', width: 200, fixed: 'left' },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 70, align: 'center' },
    // Import price - only for ADMIN
    ...(isAdmin ? [{
      title: 'Giá nhập',
      dataIndex: 'importPrice',
      key: 'importPrice',
      width: 120,
      align: 'right',
      render: (val) => <span style={{ color: '#d46b08', fontWeight: 500 }}>{formatPrice(val)}</span>,
    }] : []),
    {
      title: 'Giá bán buôn',
      dataIndex: 'wholesalePrice',
      key: 'wholesalePrice',
      width: 120,
      align: 'right',
      render: formatPrice,
    },
    {
      title: 'Giá ĐL vừa',
      dataIndex: 'mediumDealerPrice',
      key: 'mediumDealerPrice',
      width: 120,
      align: 'right',
      render: formatPrice,
    },
    {
      title: 'Giá ĐL lớn',
      dataIndex: 'largeDealerPrice',
      key: 'largeDealerPrice',
      width: 120,
      align: 'right',
      render: formatPrice,
    },
    {
      title: 'Giá bán lẻ',
      dataIndex: 'retailPrice',
      key: 'retailPrice',
      width: 120,
      align: 'right',
      render: formatPrice,
    },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      width: 90,
      align: 'center',
      render: (val, record) => (
        <Space>
          <span style={{ color: val <= record.minStock ? 'red' : 'inherit', fontWeight: val <= record.minStock ? 'bold' : 'normal' }}>
            {val}
          </span>
          {val <= record.minStock && <WarningOutlined style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      align: 'center',
      render: (val) => <Tag color={val ? 'green' : 'red'}>{val ? 'Hoạt động' : 'Ngừng'}</Tag>,
    },
    {
      title: '',
      key: 'actions',
      width: 90,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa sản phẩm này?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Mobile Card Component
  const ProductCard = ({ product }) => (
    <Card
      size="small"
      style={{ marginBottom: 12, cursor: 'pointer' }}
      onClick={() => handleView(product)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{product.name}</div>
          <div style={{ color: '#888', fontSize: 13 }}>
            <span style={{ marginRight: 12 }}>SKU: {product.sku}</span>
            <span>ĐVT: {product.unit || '—'}</span>
          </div>
        </div>
        <Tag color={product.active ? 'green' : 'red'}>
          {product.active ? 'Hoạt động' : 'Ngừng'}
        </Tag>
      </div>
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        {isAdmin && (
          <div>
            <div style={{ fontSize: 11, color: '#d46b08' }}>Giá nhập</div>
            <div style={{ fontWeight: 600, color: '#d46b08' }}>{formatPrice(product.importPrice)}</div>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: '#888' }}>Giá bán lẻ</div>
          <div style={{ fontWeight: 600, color: '#2a9299' }}>{formatPrice(product.retailPrice)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: '#888' }}>Tồn kho</div>
          <div style={{
            fontWeight: 600,
            color: product.stock <= product.minStock ? '#ff4d4f' : '#333'
          }}>
            {product.stock} {product.stock <= product.minStock && <WarningOutlined style={{ color: '#faad14' }} />}
          </div>
        </div>
      </div>
    </Card>
  )

  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16
      }}>
        <Title level={4} style={{ margin: 0 }}>Sản phẩm</Title>
        <Space style={{ width: isMobile ? '100%' : 'auto' }} direction={isMobile ? 'vertical' : 'horizontal'}>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 250 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} block={isMobile}>
            Thêm mới
          </Button>
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
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
                <LoadMoreButton
                  loading={loadingMore}
                  hasMore={hasMore}
                  onClick={handleLoadMore}
                  current={products.length}
                  total={pagination.total}
                  itemName="sản phẩm"
                />
              </>
            )}
          </div>
        </PullToRefresh>
      ) : (
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} sản phẩm`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }))
              loadProducts(page, true)
            },
          }}
          scroll={{ x: 1200 }}
        />
      )}
    </div>
  )
}

export default ProductList
