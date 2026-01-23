import { useEffect, useState } from 'react'
import {
  Table, Button, Input, Space, Modal, Form, Select, message, Tag, Popconfirm, Row, Col, Card, Tooltip, Grid, Descriptions
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  UserOutlined,
  PhoneOutlined,
  EyeOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons'
import { customersAPI, customerGroupsAPI } from '../../services/api'

const { useBreakpoint } = Grid

const CustomerList = () => {
  const [customers, setCustomers] = useState([])
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState(null)
  const [viewingCustomer, setViewingCustomer] = useState(null)
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 })
  const [form] = Form.useForm()
  const screens = useBreakpoint()

  const isMobile = !screens.md

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

  const handleView = (record) => {
    setViewingCustomer(record)
    setViewModalOpen(true)
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

  // Mobile Customer Card
  const CustomerCard = ({ customer }) => {
    const color = getGroupColor(customer.customerGroup?.code)
    const debt = Number(customer.totalDebt)
    return (
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        actions={[
          <EyeOutlined key="view" onClick={() => handleView(customer)} />,
          <EditOutlined key="edit" onClick={() => handleEdit(customer)} />,
          <Popconfirm
            key="delete"
            title="Xác nhận xóa?"
            onConfirm={() => handleDelete(customer.id)}
          >
            <DeleteOutlined style={{ color: '#ff4d4f' }} />
          </Popconfirm>,
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#2d3640' }}>{customer.name}</div>
            <div style={{ fontSize: 12, color: '#788492', marginTop: 4 }}>
              <span style={{ fontFamily: 'monospace' }}>{customer.code}</span>
            </div>
          </div>
          {customer.customerGroup && (
            <Tag style={{
              background: color.bg,
              color: color.text,
              border: 'none',
              borderRadius: 20,
              fontSize: 11,
            }}>
              {customer.customerGroup.name}
            </Tag>
          )}
        </div>
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: 13, color: '#788492' }}>
            {customer.phone && (
              <span><PhoneOutlined style={{ marginRight: 4 }} />{customer.phone}</span>
            )}
          </div>
          <div style={{
            fontWeight: 600,
            color: debt > 0 ? '#de350b' : '#22a06b',
          }}>
            {debt.toLocaleString('vi-VN')} đ
          </div>
        </div>
        {customer.address && (
          <div style={{ marginTop: 8, fontSize: 12, color: '#98a4b3' }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {[customer.address, customer.ward, customer.district].filter(Boolean).join(', ')}
          </div>
        )}
      </Card>
    )
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
      <div style={{
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16
      }}>
        <h1 className="page-title" style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Khách hàng</h1>
        <Space style={{ width: isMobile ? '100%' : 'auto' }} direction={isMobile ? 'vertical' : 'horizontal'}>
          <Input
            placeholder="Tìm theo tên, SĐT..."
            prefix={<SearchOutlined style={{ color: '#98a4b3' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 280 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
            block={isMobile}
          >
            Thêm khách hàng
          </Button>
        </Space>
      </div>

      {/* Stats Summary */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ color: '#788492', fontSize: isMobile ? 11 : 13, marginBottom: 4 }}>Tổng KH</div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: '#134e52' }}>
              {pagination.total}
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ color: '#788492', fontSize: isMobile ? 11 : 13, marginBottom: 4 }}>Nhóm KH</div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: '#2a9299' }}>
              {groups.length}
            </div>
          </Card>
        </Col>
        <Col xs={8}>
          <Card size="small" style={{ textAlign: 'center' }}>
            <div style={{ color: '#788492', fontSize: isMobile ? 11 : 13, marginBottom: 4 }}>Có nợ</div>
            <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 600, color: '#de350b' }}>
              {customers.filter(c => Number(c.totalDebt) > 0).length}
            </div>
          </Card>
        </Col>
      </Row>

      {/* Data - Table or Cards */}
      {isMobile ? (
        <div>
          {loading ? (
            <Card loading={true} />
          ) : (
            <>
              {customers.map((customer) => (
                <CustomerCard key={customer.id} customer={customer} />
              ))}
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#888' }}>
                Hiển thị {customers.length} / {pagination.total} khách hàng
              </div>
            </>
          )}
        </div>
      ) : (
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
      )}

      {/* View Modal for Mobile */}
      <Modal
        title="Chi tiết khách hàng"
        open={viewModalOpen}
        onCancel={() => setViewModalOpen(false)}
        footer={[
          <Button key="edit" type="primary" onClick={() => {
            setViewModalOpen(false)
            handleEdit(viewingCustomer)
          }}>
            Chỉnh sửa
          </Button>
        ]}
      >
        {viewingCustomer && (
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Mã KH">{viewingCustomer.code}</Descriptions.Item>
            <Descriptions.Item label="Tên">{viewingCustomer.name}</Descriptions.Item>
            <Descriptions.Item label="Nhóm KH">
              {viewingCustomer.customerGroup?.name || '—'}
            </Descriptions.Item>
            <Descriptions.Item label="Điện thoại">{viewingCustomer.phone || '—'}</Descriptions.Item>
            <Descriptions.Item label="Địa chỉ">{viewingCustomer.address || '—'}</Descriptions.Item>
            <Descriptions.Item label="Quận/Huyện">{viewingCustomer.district || '—'}</Descriptions.Item>
            <Descriptions.Item label="Phường/Xã">{viewingCustomer.ward || '—'}</Descriptions.Item>
            <Descriptions.Item label="Công nợ">
              <span style={{
                fontWeight: 600,
                color: Number(viewingCustomer.totalDebt) > 0 ? '#de350b' : '#22a06b'
              }}>
                {Number(viewingCustomer.totalDebt).toLocaleString('vi-VN')} đ
              </span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

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
        width={isMobile ? '100%' : 640}
        style={isMobile ? { top: 20 } : undefined}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ marginTop: 24 }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item name="code" label="Mã khách hàng">
                <Input placeholder="Tự động sinh nếu để trống" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
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
            <Col xs={24} sm={12}>
              <Form.Item name="district" label="Quận/Huyện">
                <Input placeholder="Quận/Huyện" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
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
