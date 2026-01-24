import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table, Button, Input, Space, Modal, message,
  Typography, Tag, Popconfirm, Card, Grid, Descriptions
} from 'antd'
import {
  PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined,
  WarningOutlined, EyeOutlined
} from '@ant-design/icons'
import { productsAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid

const ProductList = () => {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [viewingProduct, setViewingProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const screens = useBreakpoint()

  const isMobile = !screens.md

  useEffect(() => {
    loadProducts()
  }, [search, pagination.current])

  const loadProducts = async () => {
    setLoading(true)
    try {
      const res = await productsAPI.getAll({
        search,
        page: pagination.current,
        limit: pagination.pageSize,
      })
      setProducts(res.data || [])
      setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }))
    } catch (error) {
      message.error('Lỗi tải danh sách sản phẩm')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    navigate('/products/create')
  }

  const handleEdit = (record) => {
    navigate(`/products/${record.id}/edit`)
  }

  const handleView = (record) => {
    setViewingProduct(record)
    setViewModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await productsAPI.delete(id)
      message.success('Xóa sản phẩm thành công')
      loadProducts()
    } catch (error) {
      message.error(error.message || 'Lỗi xóa sản phẩm')
    }
  }

  const formatPrice = (val) => Number(val).toLocaleString('vi-VN') + ' đ'

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 110, fixed: 'left' },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name', width: 200, fixed: 'left' },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 70, align: 'center' },
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
      style={{ marginBottom: 12 }}
      actions={[
        <EyeOutlined key="view" onClick={() => handleView(product)} />,
        <EditOutlined key="edit" onClick={() => handleEdit(product)} />,
        <Popconfirm
          key="delete"
          title="Xác nhận xóa?"
          onConfirm={() => handleDelete(product.id)}
        >
          <DeleteOutlined style={{ color: '#ff4d4f' }} />
        </Popconfirm>,
      ]}
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
        <div>
          {loading ? (
            <Card loading={true} />
          ) : (
            <>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#888' }}>
                Hiển thị {products.length} / {pagination.total} sản phẩm
              </div>
            </>
          )}
        </div>
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
            onChange: (page) => setPagination((prev) => ({ ...prev, current: page })),
          }}
          scroll={{ x: 1200 }}
        />
      )}

      {/* View Modal for Mobile */}
      <Modal
        title="Chi tiết sản phẩm"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="edit" type="primary" onClick={() => {
            setViewModalOpen(false)
            handleEdit(viewingProduct)
          }}>
            Chỉnh sửa
          </Button>
        ]}
      >
        {viewingProduct && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="SKU">{viewingProduct.sku}</Descriptions.Item>
            <Descriptions.Item label="Tên sản phẩm">{viewingProduct.name}</Descriptions.Item>
            <Descriptions.Item label="Đơn vị">{viewingProduct.unit || '—'}</Descriptions.Item>
            <Descriptions.Item label="Giá bán buôn">{formatPrice(viewingProduct.wholesalePrice)}</Descriptions.Item>
            <Descriptions.Item label="Giá ĐL vừa">{formatPrice(viewingProduct.mediumDealerPrice)}</Descriptions.Item>
            <Descriptions.Item label="Giá ĐL lớn">{formatPrice(viewingProduct.largeDealerPrice)}</Descriptions.Item>
            <Descriptions.Item label="Giá bán lẻ">{formatPrice(viewingProduct.retailPrice)}</Descriptions.Item>
            <Descriptions.Item label="Tồn kho">{viewingProduct.stock}</Descriptions.Item>
            <Descriptions.Item label="Tồn tối thiểu">{viewingProduct.minStock}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái">
              <Tag color={viewingProduct.active ? 'green' : 'red'}>
                {viewingProduct.active ? 'Hoạt động' : 'Ngừng'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

export default ProductList
