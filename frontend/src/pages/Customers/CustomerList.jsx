import { useEffect, useState } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, Select, message, Typography, Tag, Popconfirm
} from 'antd'
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { customersAPI, customerGroupsAPI } from '../../services/api'

const { Title } = Typography

const CustomerList = () => {
  const [customers, setCustomers] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [form] = Form.useForm()

  useEffect(() => {
    loadGroups()
  }, [])

  useEffect(() => {
    loadCustomers()
  }, [search, pagination.current])

  const loadGroups = async () => {
    try {
      const res = await customerGroupsAPI.getAll()
      setGroups(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const res = await customersAPI.getAll({
        search,
        page: pagination.current,
        limit: pagination.pageSize,
      })
      setCustomers(res.data || [])
      setPagination((prev) => ({ ...prev, total: res.pagination?.total || 0 }))
    } catch (error) {
      message.error('Lỗi tải danh sách khách hàng')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingCustomer(null)
    form.resetFields()
    setModalOpen(true)
  }

  const handleEdit = (record) => {
    setEditingCustomer(record)
    form.setFieldsValue(record)
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await customersAPI.delete(id)
      message.success('Xóa khách hàng thành công')
      loadCustomers()
    } catch (error) {
      message.error(error.message || 'Lỗi xóa khách hàng')
    }
  }

  const handleSubmit = async (values) => {
    try {
      if (editingCustomer) {
        await customersAPI.update(editingCustomer.id, values)
        message.success('Cập nhật khách hàng thành công')
      } else {
        await customersAPI.create(values)
        message.success('Tạo khách hàng thành công')
      }
      setModalOpen(false)
      loadCustomers()
    } catch (error) {
      message.error(error.message || 'Lỗi lưu khách hàng')
    }
  }

  const columns = [
    { title: 'Mã KH', dataIndex: 'code', key: 'code', width: 120 },
    { title: 'Tên khách hàng', dataIndex: 'name', key: 'name' },
    {
      title: 'Nhóm KH',
      dataIndex: 'customerGroup',
      key: 'customerGroup',
      render: (group) => group ? <Tag color="blue">{group.name}</Tag> : '-',
    },
    { title: 'Điện thoại', dataIndex: 'phone', key: 'phone', width: 120 },
    { title: 'Địa chỉ', dataIndex: 'address', key: 'address', ellipsis: true },
    {
      title: 'Công nợ',
      dataIndex: 'totalDebt',
      key: 'totalDebt',
      width: 120,
      render: (val) => {
        const debt = Number(val)
        return (
          <span style={{ color: debt > 0 ? 'red' : 'inherit' }}>
            {debt.toLocaleString('vi-VN')} đ
          </span>
        )
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
          <Popconfirm
            title="Xác nhận xóa khách hàng này?"
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
        <Title level={4} style={{ margin: 0 }}>Khách hàng</Title>
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
        dataSource={customers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng ${total} khách hàng`,
          onChange: (page) => setPagination((prev) => ({ ...prev, current: page })),
        }}
      />

      <Modal
        title={editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item name="code" label="Mã khách hàng">
            <Input placeholder="Tự động sinh nếu để trống" />
          </Form.Item>
          <Form.Item
            name="name"
            label="Tên khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="customerGroupId" label="Nhóm khách hàng">
            <Select allowClear placeholder="Chọn nhóm">
              {groups.map((g) => (
                <Select.Option key={g.id} value={g.id}>{g.name}</Select.Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="phone" label="Điện thoại">
            <Input />
          </Form.Item>
          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="district" label="Quận/Huyện">
            <Input />
          </Form.Item>
          <Form.Item name="ward" label="Phường/Xã">
            <Input />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CustomerList
