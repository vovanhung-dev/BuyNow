import { useEffect, useState } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, Select, message, Tag, Popconfirm, Row, Col, Card, Tooltip
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
} from '@ant-design/icons'
import { customersAPI, customerGroupsAPI } from '../../services/api'

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

  const getGroupColor = (groupCode) => {
    const colors = {
      DLN: { bg: '#fff7d6', text: '#e5a100' },
      DLV: { bg: '#e6f2ff', text: '#0065ff' },
      dailylon: { bg: '#dcf7e9', text: '#22a06b' },
    }
    return colors[groupCode] || { bg: '#f4f5f7', text: '#5e6c7b' }
  }

  const columns = [
    {
      title: 'Mã KH',
      dataIndex: 'code',
      key: 'code',
      width: 130,
      render: (code) => (
        <span style={{
          fontFamily: 'monospace',
          fontSize: 13,
          color: '#134e52',
          fontWeight: 500,
        }}>
          {code}
        </span>
      ),
    },
    {
      title: 'Tên khách hàng',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => (
        <div>
          <div style={{ fontWeight: 500, color: '#2d3640' }}>{name}</div>
          {record.phone && (
            <div style={{ fontSize: 12, color: '#788492', marginTop: 2 }}>
              <PhoneOutlined style={{ marginRight: 4 }} />
              {record.phone}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Nhóm KH',
      dataIndex: 'customerGroup',
      key: 'customerGroup',
      width: 140,
      render: (group) => {
        if (!group) return <span style={{ color: '#98a4b3' }}>—</span>
        const color = getGroupColor(group.code)
        return (
          <Tag style={{
            background: color.bg,
            color: color.text,
            border: 'none',
            borderRadius: 20,
            padding: '4px 12px',
            fontWeight: 500,
          }}>
            {group.name}
          </Tag>
        )
      },
    },
    {
      title: 'Địa chỉ',
      dataIndex: 'address',
      key: 'address',
      ellipsis: true,
      render: (address, record) => (
        <Tooltip title={[address, record.ward, record.district].filter(Boolean).join(', ')}>
          <span style={{ color: '#5e6c7b' }}>
            {address || <span style={{ color: '#c1c9d2' }}>—</span>}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Công nợ',
      dataIndex: 'totalDebt',
      key: 'totalDebt',
      width: 140,
      align: 'right',
      render: (val) => {
        const debt = Number(val)
        return (
          <span style={{
            fontWeight: 600,
            color: debt > 0 ? '#de350b' : '#22a06b',
          }}>
            {debt.toLocaleString('vi-VN')} đ
          </span>
        )
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Chỉnh sửa">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              style={{ color: '#2a9299' }}
            />
          </Tooltip>
          <Popconfirm
            title="Xóa khách hàng"
            description="Bạn có chắc muốn xóa khách hàng này?"
            onConfirm={() => handleDelete(record.id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Xóa">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div className="page-header">
        <h1 className="page-title">Khách hàng</h1>
        <Space size={12}>
          <Input
            placeholder="Tìm theo tên, SĐT..."
            prefix={<SearchOutlined style={{ color: '#98a4b3' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 280 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Thêm khách hàng
          </Button>
        </Space>
      </div>

      {/* Stats Summary */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ color: '#788492', fontSize: 13, marginBottom: 4 }}>Tổng khách hàng</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#134e52' }}>
              {pagination.total}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ color: '#788492', fontSize: 13, marginBottom: 4 }}>Nhóm khách hàng</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#2a9299' }}>
              {groups.length}
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ color: '#788492', fontSize: 13, marginBottom: 4 }}>Có công nợ</div>
            <div style={{ fontSize: 24, fontWeight: 600, color: '#de350b' }}>
              {customers.filter(c => Number(c.totalDebt) > 0).length}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Data Table */}
      <Table
        dataSource={customers}
        columns={columns}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total, range) => (
            <span style={{ color: '#788492' }}>
              Hiển thị {range[0]}-{range[1]} / {total} khách hàng
            </span>
          ),
          onChange: (page, pageSize) => setPagination((prev) => ({
            ...prev,
            current: page,
            pageSize,
          })),
        }}
      />

      {/* Modal Form */}
      <Modal
        title={
          <Space>
            <UserOutlined />
            {editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}
          </Space>
        }
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        okText={editingCustomer ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        width={640}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Mã khách hàng">
                <Input placeholder="Tự động sinh nếu để trống" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="customerGroupId" label="Nhóm khách hàng">
                <Select allowClear placeholder="Chọn nhóm">
                  {groups.map((g) => (
                    <Select.Option key={g.id} value={g.id}>
                      {g.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="name"
            label="Tên khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input placeholder="Nhập tên khách hàng" />
          </Form.Item>

          <Form.Item name="phone" label="Số điện thoại">
            <Input placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item name="address" label="Địa chỉ">
            <Input.TextArea rows={2} placeholder="Nhập địa chỉ chi tiết" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="district" label="Quận/Huyện">
                <Input placeholder="Quận/Huyện" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ward" label="Phường/Xã">
                <Input placeholder="Phường/Xã" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default CustomerList
