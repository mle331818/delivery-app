import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom'
import axios from 'axios'
import Menu from './components/Menu'
import Cart from './components/Cart'
import Checkout from './components/Checkout'
import Login from './components/Login'
import Register from './components/Register'
import Orders from './components/Orders'
import Kitchen from './components/Kitchen'
import Admin from './components/Admin'
import Delivery from './components/Delivery'
import './App.css'
import React from 'react'

axios.defaults.baseURL = 'http://localhost:5000'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', textAlign: 'center' }}>
          <h2>⚠️ Something went wrong</h2>
          <pre style={{ textAlign: 'left', background: '#eee', padding: '1rem', overflow: 'auto' }}>
            {this.state.error && this.state.error.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem('cart')
      return savedCart ? JSON.parse(savedCart) : []
    } catch (e) {
      console.error('Error loading cart:', e)
      return []
    }
  })
  const [cartNotification, setCartNotification] = useState(null)
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false)

  useEffect(() => {
    const initApp = async () => {
      try {
        const token = localStorage.getItem('token')
        if (token) {
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
          const res = await axios.get('/api/auth/me')
          setUser(res.data.user)
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        localStorage.removeItem('token')
        delete axios.defaults.headers.common['Authorization']
      } finally {
        setLoading(false)
      }
    }

    initApp()
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('cart', JSON.stringify(cart))
    } catch (e) {
      console.error('Error saving cart:', e)
    }
  }, [cart])

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.menuItemId === item.id)
      const newCart = existing
        ? prev.map(i =>
          i.menuItemId === item.id
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
        : [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }]

      setCartNotification(`${item.name} added to cart!`)
      setTimeout(() => setCartNotification(null), 2000)
      return newCart
    })
  }

  const updateCartItem = (menuItemId, quantity) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(i => i.menuItemId !== menuItemId))
    } else {
      setCart(prev => prev.map(i =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      ))
    }
  }

  const clearCart = () => {
    setCart([])
    localStorage.removeItem('cart')
  }

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('cart')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
    setCart([])
  }

  if (loading) {
    return (
      <div className="loading">
        <div style={{ textAlign: 'center' }}>
          <h2>🍣</h2>
          <p>Loading Sushi Stun...</p>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="app">
          <header className="header">
            <div className="container">
              <Link to="/" className="branding-link">
                <h1>🍣 Sushi Stun Delivery</h1>
              </Link>
              <nav>
                {user ? (
                  <>
                    <span>Welcome, {user.firstName || user.email}!</span>
                    <span
                      className="loyalty-badge"
                      onClick={() => setShowLoyaltyModal(true)}
                      title="Click to see details"
                    >
                      💎 {user.loyalty_points || 0} Pts
                    </span>
                    <Link to="/orders">My Orders</Link>
                    {(user.role === 'kitchen' || user.role === 'admin') && (
                      <Link to="/kitchen">Kitchen</Link>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin">Admin</Link>
                    )}
                    {user.role === 'delivery' && (
                      <Link to="/delivery">Delivery</Link>
                    )}
                    <button onClick={logout}>Logout</button>
                  </>
                ) : (
                  <>
                    <Link to="/login">Login</Link>
                    <Link to="/register">Register</Link>
                  </>
                )}
                {cart.length > 0 && (
                  <Link to="/cart" className="cart-link">
                    Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)})
                  </Link>
                )}
              </nav>
            </div>
          </header>

          {cartNotification && (
            <div className="cart-notification">
              {cartNotification}
            </div>
          )}

          {showLoyaltyModal && (
            <div className="modal-overlay" onClick={() => setShowLoyaltyModal(false)}>
              <div className="modal-content" onClick={e => e.stopPropagation()}>
                <h3 style={{ marginTop: 0 }}>💎 Loyalty Program</h3>
                <p style={{ fontSize: '1.1rem' }}>You have <strong>{user.loyalty_points || 0}</strong> points.</p>
                <div style={{ background: '#f5f5f5', padding: '1rem', margin: '1rem 0', borderRadius: '8px' }}>
                  <p style={{ margin: 0, color: '#666' }}>Estimated Redemption Value</p>
                  <strong style={{ fontSize: '1.5rem', color: '#2e7d32' }}>
                    ${((user.loyalty_points || 0) * 0.05).toFixed(2)}
                  </strong>
                </div>
                <button className="btn btn-primary" onClick={() => setShowLoyaltyModal(false)}>Close</button>
              </div>
            </div>
          )}

          <main className="main">
            <Routes>
              <Route path="/" element={<Menu addToCart={addToCart} />} />
              <Route path="/cart" element={<Cart cart={cart} updateCartItem={updateCartItem} />} />
              <Route path="/checkout" element={user ? <Checkout cart={cart} clearCart={clearCart} /> : <Navigate to="/login" />} />
              <Route path="/login" element={user ? <Navigate to="/" /> : <Login onLogin={login} />} />
              <Route path="/register" element={user ? <Navigate to="/" /> : <Register onLogin={login} />} />
              <Route path="/orders" element={user ? <Orders /> : <Navigate to="/login" />} />
              <Route path="/kitchen" element={user && (user.role === 'kitchen' || user.role === 'admin') ? <Kitchen /> : <Navigate to="/" />} />
              <Route path="/admin" element={user && user.role === 'admin' ? <Admin /> : <Navigate to="/" />} />
              <Route path="/delivery" element={user && user.role === 'delivery' ? <Delivery /> : <Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </ErrorBoundary>
  )
}

export default App
