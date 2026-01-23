import { useEffect, useState } from 'react'
import { Table, Button, Input, Space, Modal, Form, Select, message, Typography, Tag, Card, Grid, Popconfirm, Switch } from 'antd'
import { SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, LockOutlined, MailOutlined, PhoneOutlined } from '@ant-design/icons'
import { usersAPI } from '../../services/api'
import { useAuthStore } from '../../store'

const { Title } = Typography
const { useBreakpoint } = Grid

const roleConfig = {
  ADMIN: { color: '#f5222d', label: 'Quản trị viên' },
  MANAGER: { color: '#1890ff', label: 'Quản lý' },
  SALES: { color: '#52c41a', label: 'Nhân viên' },
}

const UserList = () => {
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [form] = Form.useForm()
  const currentUser = useAuthStore((state) => state.user)

  useEffect(() => {
    loadUsers()
  }, [search])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const res = await usersAPI.getAll({ search })
      setUsers(res.data || [])
    } catch (error) {
      message.error('Lỗi tải danh sách tài khoản')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    try {
      if (editingUser) {
        // Update - don't send password if empty
        const updateData = { ...values }
        if (!updateData.password) {
          delete updateData.password
        }
        await usersAPI.update(editingUser.id, updateData)
        message.success('Cập nhật tài khoản thành công')
      } else {
        // Create
        await usersAPI.create(values)
        message.success('Tạo tài khoản thành công')
      }
      setModalOpen(false)
      form.resetFields()
      setEditingUser(null)
      loadUsers()
    } catch (error) {
      message.error(error.message || 'Lỗi xử lý')
    }
  }

  const handleEdit = (record) => {
    setEditingUser(record)
    form.setFieldsValue({
      name: record.name,
      email: record.email,
      phone: record.phone,
      role: record.role,
      active: record.active,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    try {
      await usersAPI.delete(id)
      message.success('Xóa tài khoản thành công')
      loadUsers()
    } catch (error) {
      message.error(error.message || 'Lỗi xóa tài khoản')
    }
  }

  const openCreateModal = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({ role: 'SALES', active: true })
    setModalOpen(true)
  }

  // Mobile User Card
  const UserCard = ({ user }) => {
    const isCurrentUser = user.id === currentUser?.id
    return (
      <Card
        size="small"
        style={{ marginBottom: 12 }}
        actions={[
          <Button
            key="edit"
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(user)}
          >
            Sửa
          </Button>,
          isCurrentUser ? (
            <Button key="delete" type="link" disabled>
              <DeleteOutlined /> Xóa
            </Button>
          ) : (
            <Popconfirm
              key="delete"
              title="Xác nhận xóa tài khoản?"
              onConfirm={() => handleDelete(user.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          ),
        ]}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #2a9299 0%, #134e52 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 600,
                fontSize: 16,
              }}>
                {user.name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{user.name}</div>
                <div style={{ fontSize: 12, color: '#788492' }}>{user.email}</div>
              </div>
            </div>
            {user.phone && (
              <div style={{ fontSize: 12, color: '#788492', marginTop: 8 }}>
                <PhoneOutlined style={{ marginRight: 4 }} /> {user.phone}
              </div>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <Tag color={roleConfig[user.role]?.color}>
              {roleConfig[user.role]?.label}
            </Tag>
            <div style={{ marginTop: 8 }}>
              <Tag color={user.active ? 'green' : 'default'}>
                {user.active ? 'Hoạt động' : 'Khóa'}
              </Tag>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const columns = [
    {
      title: 'Tài khoản',
      key: 'user',
      render: (_, record) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #2a9299 0%, #134e52 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 600,
            fontSize: 16,
          }}>
            {record.name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <div style={{ fontWeight: 500 }}>{record.name}</div>
            <div style={{ fontSize: 12, color: '#788492' }}>{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'SĐT',
      dataIndex: 'phone',
      key: 'phone',
      width: 120,
      render: (val) => val || '-',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 130,
      render: (val) => (
        <Tag color={roleConfig[val]?.color}>{roleConfig[val]?.label}</Tag>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'active',
      key: 'active',
      width: 100,
      render: (val) => (
        <Tag color={val ? 'green' : 'default'}>{val ? 'Hoạt động' : 'Khóa'}</Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        const isCurrentUser = record.id === currentUser?.id
        return (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
              Sửa
            </Button>
            {!isCurrentUser && (
              <Popconfirm title="Xác nhận xóa tài khoản?" onConfirm={() => handleDelete(record.id)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            )}
          </Space>
        )
      },
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
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>Quản lý tài khoản</Title>
        <Space style={{ width: isMobile ? '100%' : 'auto' }} direction={isMobile ? 'vertical' : 'horizontal'}>
          <Input
            placeholder="Tìm kiếm..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 200 }}
            allowClear
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={openCreateModal}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            Thêm tài khoản
          </Button>
        </Space>
      </div>

      {/* Stats */}
      <div style={{
        marginBottom: 16,
        padding: isMobile ? 12 : 16,
        background: '#eef9fa',
        borderRadius: 8,
        display: 'flex',
        flexWrap: 'wrap',
        gap: isMobile ? 8 : 24,
      }}>
        <span style={{ fontSize: isMobile ? 13 : 14 }}>
          Tổng số: <strong style={{ color: '#134e52' }}>{users.length}</strong> tài khoản
        </span>
        <span style={{ fontSize: isMobile ? 13 : 14 }}>
          Admin: <strong style={{ color: '#f5222d' }}>{users.filter(u => u.role === 'ADMIN').length}</strong>
        </span>
        <span style={{ fontSize: isMobile ? 13 : 14 }}>
          Quản lý: <strong style={{ color: '#1890ff' }}>{users.filter(u => u.role === 'MANAGER').length}</strong>
        </span>
        <span style={{ fontSize: isMobile ? 13 : 14 }}>
          Nhân viên: <strong style={{ color: '#52c41a' }}>{users.filter(u => u.role === 'SALES').length}</strong>
        </span>
      </div>

      {/* Content - Table or Cards */}
      {isMobile ? (
        <div>
          {loading ? (
            <Card loading={true} />
          ) : (
            <>
              {users.map((user) => (
                <UserCard key={user.id} user={user} />
              ))}
              <div style={{ textAlign: 'center', padding: '16px 0', color: '#888' }}>
                Hiển thị {users.length} tài khoản
              </div>
            </>
          )}
        </div>
      ) : (
        <Table
          dataSource={users}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20, showTotal: (total) => `Tổng ${total} tài khoản` }}
        />
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingUser ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false)
          form.resetFields()
          setEditingUser(null)
        }}
        onOk={() => form.submit()}
        width={isMobile ? '100%' : 520}
        style={isMobile ? { top: 20 } : undefined}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Họ tên"
            rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="Nhập họ tên" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Vui lòng nhập email' },
              { type: 'email', message: 'Email không hợp lệ' },
            ]}
          >
            <Input prefix={<MailOutlined />} placeholder="Nhập email" />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            rules={editingUser ? [] : [{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input prefix={<PhoneOutlined />} placeholder="Nhập số điện thoại" />
          </Form.Item>

          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò">
              <Select.Option value="ADMIN">
                <Tag color="#f5222d">Quản trị viên</Tag>
              </Select.Option>
              <Select.Option value="MANAGER">
                <Tag color="#1890ff">Quản lý</Tag>
              </Select.Option>
              <Select.Option value="SALES">
                <Tag color="#52c41a">Nhân viên</Tag>
              </Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="active"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Khóa" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default UserList
