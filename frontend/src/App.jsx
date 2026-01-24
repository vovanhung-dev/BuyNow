import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store'
import MainLayout from './components/layout/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CustomerList from './pages/Customers/CustomerList'
import CustomerForm from './pages/Customers/CustomerForm'
import CustomerDetail from './pages/Customers/CustomerDetail'
import ProductList from './pages/Products/ProductList'
import ProductForm from './pages/Products/ProductForm'
import ProductDetail from './pages/Products/ProductDetail'
import OrderList from './pages/Orders/OrderList'
import OrderCreate from './pages/Orders/OrderCreate'
import OrderDetail from './pages/Orders/OrderDetail'
import StockList from './pages/Stock/StockList'
import StockImport from './pages/Stock/StockImport'
import StockAdjust from './pages/Stock/StockAdjust'
import PaymentList from './pages/Payments/PaymentList'
import UserList from './pages/Users/UserList'
import UserForm from './pages/Users/UserForm'

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Admin Only Route component
const AdminRoute = ({ children }) => {
  const user = useAuthStore((state) => state.user)

  if (user?.role !== 'ADMIN') {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/create" element={<CustomerForm />} />
          <Route path="customers/:id" element={<CustomerDetail />} />
          <Route path="customers/:id/edit" element={<CustomerForm />} />
          <Route path="products" element={<ProductList />} />
          <Route path="products/create" element={<ProductForm />} />
          <Route path="products/:id" element={<ProductDetail />} />
          <Route path="products/:id/edit" element={<ProductForm />} />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/create" element={<OrderCreate />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="stock" element={<StockList />} />
          <Route path="stock/import" element={<StockImport />} />
          <Route path="stock/:id/adjust" element={<StockAdjust />} />
          <Route path="payments" element={<PaymentList />} />
          <Route path="users" element={<AdminRoute><UserList /></AdminRoute>} />
          <Route path="users/create" element={<AdminRoute><UserForm /></AdminRoute>} />
          <Route path="users/:id/edit" element={<AdminRoute><UserForm /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
