import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider } from 'antd'
import viVN from 'antd/locale/vi_VN'
import dayjs from 'dayjs'
import 'dayjs/locale/vi'
import App from './App'
import './index.css'

dayjs.locale('vi')

// Premium Enterprise Theme - Vietnamese Business Elegance
const theme = {
  token: {
    // Primary Colors - Deep Teal
    colorPrimary: '#2a9299',
    colorPrimaryHover: '#21777e',
    colorPrimaryActive: '#1a6268',
    colorPrimaryBg: '#eef9fa',
    colorPrimaryBgHover: '#d4f0f2',
    colorPrimaryBorder: '#a3dfe2',
    colorPrimaryBorderHover: '#6ec9ce',
    colorPrimaryText: '#134e52',
    colorPrimaryTextHover: '#0d3b3e',
    colorPrimaryTextActive: '#0d3b3e',

    // Success Colors
    colorSuccess: '#22a06b',
    colorSuccessBg: '#dcf7e9',
    colorSuccessBorder: '#22a06b',

    // Warning Colors
    colorWarning: '#e5a100',
    colorWarningBg: '#fff7d6',
    colorWarningBorder: '#e5a100',

    // Error Colors
    colorError: '#de350b',
    colorErrorBg: '#ffedeb',
    colorErrorBorder: '#de350b',

    // Info Colors
    colorInfo: '#0065ff',
    colorInfoBg: '#e6f2ff',
    colorInfoBorder: '#0065ff',

    // Neutral Colors
    colorText: '#2d3640',
    colorTextSecondary: '#5e6c7b',
    colorTextTertiary: '#788492',
    colorTextQuaternary: '#98a4b3',
    colorBgContainer: '#ffffff',
    colorBgLayout: '#f4f5f7',
    colorBgElevated: '#ffffff',
    colorBorder: '#e1e5ea',
    colorBorderSecondary: '#f4f5f7',

    // Typography
    fontFamily: "'Be Vietnam Pro', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    fontSize: 14,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    // Border Radius
    borderRadius: 10,
    borderRadiusLG: 16,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // Shadows
    boxShadow: '0 4px 12px rgba(13, 59, 62, 0.1)',
    boxShadowSecondary: '0 8px 24px rgba(13, 59, 62, 0.12)',

    // Control - use defaults

    // Motion
    motionDurationFast: '150ms',
    motionDurationMid: '250ms',
    motionDurationSlow: '400ms',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  components: {
    Button: {
      fontWeight: 500,
    },
    Card: {
      headerBg: '#fafbfc',
      headerFontSize: 16,
      headerFontSizeSM: 14,
    },
    Table: {
      headerBg: '#fafbfc',
      headerColor: '#454f5b',
      headerSplitColor: '#e1e5ea',
      rowHoverBg: '#eef9fa',
    },
    Menu: {
      darkItemBg: 'transparent',
      darkSubMenuItemBg: 'transparent',
      darkItemSelectedBg: 'linear-gradient(90deg, #21777e, #2a9299)',
    },
    Modal: {
      headerBg: 'linear-gradient(135deg, #1a6268, #21777e)',
      titleColor: '#ffffff',
    },
    Tag: {
      defaultBg: '#f4f5f7',
    },
    Statistic: {
      contentFontSize: 36,
      titleFontSize: 14,
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConfigProvider locale={viVN} theme={theme}>
      <App />
    </ConfigProvider>
  </React.StrictMode>
)
