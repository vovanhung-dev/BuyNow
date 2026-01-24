import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Button, Input, Space, message, Typography, Tag, Card, Grid } from 'antd'
import { SearchOutlined, PlusOutlined, WarningOutlined, EditOutlined } from '@ant-design/icons'
import { stockAPI } from '../../services/api'
import PullToRefresh from '../../components/common/PullToRefresh'
import LoadMoreButton from '../../components/common/LoadMoreButton'

const { Title } = Typography
const { useBreakpoint } = Grid

const StockList = () => {
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [stock, setStock] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [search, setSearch] = useState('')
  const [showLowStock, setShowLowStock] = useState(false)
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })

  useEffect(() => {
    setPagination(prev => ({ ...prev, current: 1 }))
    setStock([])
    loadStock(1, true)
  }, [search, showLowStock])

  const loadStock = useCallback(async (page = 1, reset = false) => {
    if (reset) {
      setLoading(true)
    } else {
      setLoadingMore(true)
    }

    try {
      const res = await stockAPI.getStock({
        search,
        lowStock: showLowStock ? 'true' : undefined,
        page,
        limit: pagination.pageSize,
      })

      const newData = res.data || []

      if (reset || page === 1) {
        setStock(newData)
      } else {
        setStock(prev => [...prev, ...newData])
      }

      setPagination(prev => ({
        ...prev,
        current: page,
        total: res.pagination?.total || 0
      }))
    } catch (error) {
      message.error('Lỗi tải tồn kho')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [search, showLowStock, pagination.pageSize])

  const handleRefresh = useCallback(async () => {
    await loadStock(1, true)
  }, [loadStock])

  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.current + 1
    loadStock(nextPage, false)
  }, [pagination.current, loadStock])

  const hasMore = stock.length < pagination.total

  const handleImport = () => {
    navigate('/stock/import')
  }

  const handleAdjust = (record) => {
    navigate(`/stock/${record.id}/adjust`)
  }

  // Mobile Stock Card
  const StockCard = ({ item }) => {
    const isLowStock = item.stock <= item.minStock
    return (
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        actions={[
          <Button
            key="adjust"
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleAdjust(item)}
          >
            Điều chỉnh
          </Button>
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15 }}>{item.name}</div>
            <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
              SKU: {item.sku} | {item.unit || '—'}
            </div>
          </div>
          <Tag color={isLowStock ? 'red' : 'green'}>
            {isLowStock ? 'Cần nhập' : 'Đủ hàng'}
          </Tag>
        </div>
        <div style={{
          marginTop: 12,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 12px',
          background: isLowStock ? '#ffedeb' : '#dcf7e9',
          borderRadius: 8,
        }}>
          <div>
            <div style={{ fontSize: 11, color: '#788492' }}>Tồn kho</div>
            <div style={{
              fontSize: 18,
              fontWeight: 600,
              color: isLowStock ? '#de350b' : '#22a06b'
            }}>
              {item.stock}
              {isLowStock && <WarningOutlined style={{ marginLeft: 6, color: '#faad14' }} />}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#788492' }}>Tối thiểu</div>
            <div style={{ fontSize: 14, fontWeight: 500, color: '#5e6c7b' }}>
              {item.minStock}
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const columns = [
    { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
    { title: 'Tên sản phẩm', dataIndex: 'name', key: 'name' },
    { title: 'ĐVT', dataIndex: 'unit', key: 'unit', width: 80 },
    {
      title: 'Tồn kho',
      dataIndex: 'stock',
      key: 'stock',
      width: 100,
      render: (val, record) => (
        <Space>
          <span style={{
            color: val <= record.minStock ? 'red' : 'inherit',
            fontWeight: val <= record.minStock ? 'bold' : 'normal'
          }}>
            {val}
          </span>
          {val <= record.minStock && <WarningOutlined style={{ color: '#faad14' }} />}
        </Space>
      ),
    },
    { title: 'Tối thiểu', dataIndex: 'minStock', key: 'minStock', width: 100 },
    {
      title: 'Trạng thái',
      key: 'status',
      width: 120,
      render: (_, record) => (
        record.stock <= record.minStock
          ? <Tag color="red">Cần nhập thêm</Tag>
          : <Tag color="green">Đủ hàng</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button size="small" onClick={() => handleAdjust(record)}>
          Điều chỉnh
        </Button>
      ),
    },
  ]

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
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Tồn kho</Title>
        <Space style={{ width: isMobile ? '100%' : 'auto' }} direction={isMobile ? 'vertical' : 'horizontal'}>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 200 }}
            allowClear
          />
          <Space style={{ width: isMobile ? '100%' : 'auto' }}>
            <Button
              type={showLowStock ? 'primary' : 'default'}
              icon={<WarningOutlined />}
              onClick={() => setShowLowStock(!showLowStock)}
              style={{ flex: isMobile ? 1 : 'unset' }}
            >
              {isMobile ? 'Cần nhập' : 'Sắp hết hàng'}
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleImport}
              style={{ flex: isMobile ? 1 : 'unset' }}
            >
              Nhập kho
            </Button>
          </Space>
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
                {stock.map((item) => (
                  <StockCard key={item.id} item={item} />
                ))}
                <LoadMoreButton
                  loading={loadingMore}
                  hasMore={hasMore}
                  onClick={handleLoadMore}
                  current={stock.length}
                  total={pagination.total}
                  itemName="sản phẩm"
                />
              </>
            )}
          </div>
        </PullToRefresh>
      ) : (
        <Table
          dataSource={stock}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng ${total} sản phẩm`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }))
              loadStock(page, true)
            },
          }}
        />
      )}

      </div>
  )
}

export default StockList
