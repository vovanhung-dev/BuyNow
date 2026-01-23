import { useEffect, useState } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, InputNumber, Switch, message, Typography, Tag, Popconfirm
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, WarningOutlined } from '@ant-design/icons'
import { productsAPI } from '../../services/api'

const { Title } = Typography

const ProductList = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [form] = Form.useForm()

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
    setEditingProduct(null)
    form.resetFields()
    form.setFieldsValue({ active: true, stock: 0, minStock: 10 })
    setModalOpen(true)
  }

  const handleEdit = (record) => {
    setEditingProduct(record)
    form.setFieldsValue({
      ...record,
      wholesalePrice: Number(record.wholesalePrice),
      mediumDealerPrice: Number(record.mediumDealerPrice),
      largeDealerPrice: Number(record.largeDealerPrice),
      retailPrice: Number(record.retailPrice),
    })
    setModalOpen(true)
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

  const handleSubmit = async (values) => {
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, values)
        message.success('Cập nhật sản phẩm thành công')
      } else {
        await productsAPI.create(values)
        message.success('Tạo sản phẩm thành công')
      }
      setModalOpen(false)
      loadProducts()
    } catch (error) {
      message.error(error.message || 'Lỗi lưu sản phẩm')
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>Sản phẩm</Title>
        <Space>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 250 }}
            allowClear
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Thêm mới
          </Button>
        </Space>
      </div>

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

      <Modal
        title={editingProduct ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Space style={{ display: 'flex' }} align="start">
            <Form.Item
              name="sku"
              label="Mã SKU"
              rules={[{ required: true, message: 'Vui lòng nhập SKU' }]}
            >
              <Input style={{ width: 150 }} />
            </Form.Item>
            <Form.Item
              name="name"
              label="Tên sản phẩm"
              rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
              style={{ flex: 1 }}
            >
              <Input />
            </Form.Item>
            <Form.Item name="unit" label="Đơn vị">
              <Input style={{ width: 100 }} placeholder="gói, chai..." />
            </Form.Item>
          </Space>

          <Title level={5}>Bảng giá</Title>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="wholesalePrice" label="Giá bán buôn">
              <InputNumber
                style={{ width: 150 }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => val.replace(/\,/g, '')}
                min={0}
              />
            </Form.Item>
            <Form.Item name="mediumDealerPrice" label="Giá ĐL vừa">
              <InputNumber
                style={{ width: 150 }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => val.replace(/\,/g, '')}
                min={0}
              />
            </Form.Item>
            <Form.Item name="largeDealerPrice" label="Giá ĐL lớn">
              <InputNumber
                style={{ width: 150 }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => val.replace(/\,/g, '')}
                min={0}
              />
            </Form.Item>
            <Form.Item name="retailPrice" label="Giá bán lẻ">
              <InputNumber
                style={{ width: 150 }}
                formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                parser={(val) => val.replace(/\,/g, '')}
                min={0}
              />
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex' }}>
            <Form.Item name="stock" label="Tồn kho">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
            <Form.Item name="minStock" label="Tồn tối thiểu">
              <InputNumber style={{ width: 120 }} min={0} />
            </Form.Item>
            <Form.Item name="active" label="Hoạt động" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </div>
  )
}

export default ProductList
