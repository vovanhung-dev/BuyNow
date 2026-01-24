import { Button } from 'antd'
import { DownOutlined } from '@ant-design/icons'

const LoadMoreButton = ({
  loading,
  hasMore,
  onClick,
  current,
  total,
  itemName = 'mục'
}) => {
  if (!hasMore && current >= total) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '16px 0',
        color: '#999',
        fontSize: 13,
      }}>
        Đã hiển thị tất cả {total} {itemName}
      </div>
    )
  }

  return (
    <div style={{
      textAlign: 'center',
      padding: '16px 0',
    }}>
      <div style={{ color: '#888', fontSize: 13, marginBottom: 12 }}>
        Hiển thị {current} / {total} {itemName}
      </div>
      {hasMore && (
        <Button
          loading={loading}
          onClick={onClick}
          icon={<DownOutlined />}
          style={{
            borderRadius: 20,
            padding: '0 24px',
            height: 40,
          }}
        >
          {loading ? 'Đang tải...' : 'Tải thêm'}
        </Button>
      )}
    </div>
  )
}

export default LoadMoreButton
