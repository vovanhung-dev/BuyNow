import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, Typography, message, Grid } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, UserOutlined, PhoneOutlined, HomeOutlined } from '@ant-design/icons'
import { customersAPI, customerGroupsAPI } from '../../services/api'

const { Title } = Typography
const { useBreakpoint } = Grid
const { TextArea } = Input

const CustomerForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const screens = useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [customerGroups, setCustomerGroups] = useState([])
  const isEdit = !!id

  useEffect(() => {
    loadCustomerGroups()
    if (isEdit) {
      loadCustomer()
    }
  }, [id])

  const loadCustomerGroups = async () => {
    try {
      const res = await customerGroupsAPI.getAll()
      setCustomerGroups(res.data || [])
    } catch (error) {
      console.error(error)
    }
  }

  const loadCustomer = async () => {
    setLoading(true)
    try {
      const res = await customersAPI.getById(id)
      form.setFieldsValue(res.data)
    } catch (error) {
      message.error('Lỗi tải thông tin khách hàng')
      navigate('/customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (values) => {
    setSaving(true)
    try {
      if (isEdit) {
        await customersAPI.update(id, values)
        message.success('Cập nhật khách hàng thành công')
      } else {
        await customersAPI.create(values)
        message.success('Thêm khách hàng thành công')
      }
      navigate('/customers')
    } catch (error) {
      message.error(error.message || 'Lỗi xử lý')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16
      }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')} />
        <Title level={4} style={{ margin: 0, fontSize: isMobile ? 18 : 24 }}>
          {isEdit ? 'Cập nhật khách hàng' : 'Thêm khách hàng mới'}
        </Title>
      </div>

      <Card loading={loading} style={{ maxWidth: 800 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{ customerGroupId: null }}
        >
          <Form.Item
            name="name"
            label="Tên khách hàng"
            rules={[{ required: true, message: 'Vui lòng nhập tên khách hàng' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Nhập tên khách hàng"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="code"
            label="Mã khách hàng"
          >
            <Input
              placeholder="Mã tự động nếu để trống"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="customerGroupId"
            label="Nhóm khách hàng"
          >
            <Select
              placeholder="Chọn nhóm khách hàng"
              allowClear
              size={isMobile ? 'large' : 'middle'}
              options={customerGroups.map((g) => ({
                value: g.id,
                label: g.name,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Số điện thoại"
          >
            <Input
              prefix={<PhoneOutlined />}
              placeholder="Nhập số điện thoại"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="address"
            label="Địa chỉ"
          >
            <TextArea
              placeholder="Nhập địa chỉ"
              rows={2}
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="district"
            label="Quận/Huyện"
          >
            <Input
              prefix={<HomeOutlined />}
              placeholder="Nhập quận/huyện"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          <Form.Item
            name="ward"
            label="Phường/Xã"
          >
            <Input
              placeholder="Nhập phường/xã"
              size={isMobile ? 'large' : 'middle'}
            />
          </Form.Item>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: 12,
            marginTop: 24,
            flexDirection: isMobile ? 'column' : 'row'
          }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={saving}
              size={isMobile ? 'large' : 'middle'}
              style={{ flex: isMobile ? 'unset' : 1, maxWidth: isMobile ? '100%' : 200 }}
            >
              {isEdit ? 'Cập nhật' : 'Thêm mới'}
            </Button>
            <Button
              onClick={() => navigate('/customers')}
              size={isMobile ? 'large' : 'middle'}
            >
              Hủy
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  )
}

export default CustomerForm
