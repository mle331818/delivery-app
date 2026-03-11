import { useState, useEffect } from 'react'
import axios from 'axios'
import './Kitchen.css'

function Kitchen() {
  const [allOrders, setAllOrders] = useState([]) // Store all orders
  const [statusFilter, setStatusFilter] = useState('pending')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [estimatedTimes, setEstimatedTimes] = useState({})

  useEffect(() => {
    loadAllOrders()
    const interval = setInterval(loadAllOrders, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, []) // Load all orders, not filtered

  const loadAllOrders = () => {
    Promise.all([
      axios.get('/api/kitchen/orders?status=pending'),
      axios.get('/api/kitchen/orders?status=preparing'),
      axios.get('/api/kitchen/orders?status=ready'),
      axios.get('/api/kitchen/orders?status=delivered')
    ])
      .then(([pendingRes, preparingRes, readyRes, deliveredRes]) => {
        // Combine all orders
        const all = [
          ...pendingRes.data,
          ...preparingRes.data,
          ...readyRes.data,
          ...deliveredRes.data
        ]
        setAllOrders(all)
        setLoading(false)
        setError(null)
      })
      .catch(err => {
        console.error('Error loading orders:', err)
        setError(err.response?.data?.error || 'Failed to load orders')
        setLoading(false)
      })
  }

  // Filter orders based on current status filter
  const orders = allOrders.filter(order => order.status === statusFilter)

  // Get counts for each status
  const pendingCount = allOrders.filter(o => o.status === 'pending').length
  const preparingCount = allOrders.filter(o => o.status === 'preparing').length
  const readyCount = allOrders.filter(o => o.status === 'ready').length
  const deliveredCount = allOrders.filter(o => o.status === 'delivered').length

  const updateStatus = (orderId, newStatus) => {
    const payload = { status: newStatus }
    if (newStatus === 'preparing') {
      payload.estimatedTime = parseInt(estimatedTimes[orderId] || 30, 10)
    }
    axios.patch(`/api/kitchen/orders/${orderId}/status`, payload)
      .then(() => {
        loadAllOrders() // Reload all orders to update counts
      })
      .catch(err => {
        alert('Failed to update order status: ' + (err.response?.data?.error || err.message))
      })
  }

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const isSQLiteFormat = typeof dateString === 'string' && !dateString.includes('T') && !dateString.includes('Z');
    const isoString = isSQLiteFormat ? dateString.replace(' ', 'T') + 'Z' : dateString;
    const date = new Date(isoString);
    
    // Calculate difference using pure UTC
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1 && diffMins >= -1) return 'Just now'
    if (diffMins < 60 && diffMins >= 0) return `${diffMins} min ago`

    // Add +2 hours exactly for user requested display
    date.setUTCHours(date.getUTCHours() + 2)
    return date.toLocaleString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' })
  }

  if (loading) {
    return <div className="loading">Loading kitchen orders...</div>
  }

  if (error) {
    return (
      <div className="kitchen-page">
        <div className="error-message">
          <h2>⚠️ Access Denied</h2>
          <p>{error}</p>
          <p>Please login with kitchen staff credentials.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="kitchen-page">
      <div className="kitchen-header">
        <h2>🍣 Kitchen Dashboard</h2>
        <div className="kitchen-stats">
          <div className="stat-badge pending">
            <span className="stat-number">{pendingCount}</span>
            <span className="stat-label">New</span>
          </div>
          <div className="stat-badge preparing">
            <span className="stat-number">{preparingCount}</span>
            <span className="stat-label">Preparing</span>
          </div>
          <div className="stat-badge ready">
            <span className="stat-number">{readyCount}</span>
            <span className="stat-label">Ready</span>
          </div>
          <div className="stat-badge delivered">
            <span className="stat-number">{deliveredCount}</span>
            <span className="stat-label">Delivered</span>
          </div>
        </div>
      </div>

      <div className="status-filters">
        <button
          className={statusFilter === 'pending' ? 'active pending' : 'pending'}
          onClick={() => setStatusFilter('pending')}
        >
          🆕 New Orders ({pendingCount})
        </button>
        <button
          className={statusFilter === 'preparing' ? 'active preparing' : 'preparing'}
          onClick={() => setStatusFilter('preparing')}
        >
          👨‍🍳 Preparing ({preparingCount})
        </button>
        <button
          className={statusFilter === 'ready' ? 'active ready' : 'ready'}
          onClick={() => setStatusFilter('ready')}
        >
          ✅ Ready ({readyCount})
        </button>
        <button
          className={statusFilter === 'delivered' ? 'active delivered' : 'delivered'}
          onClick={() => setStatusFilter('delivered')}
        >
          🎉 Delivered ({deliveredCount})
        </button>
      </div>

      {statusFilter === 'delivered' ? (() => {
        const deliveredTotal = orders.reduce((sum, o) => sum + (o.total || 0), 0)
        return (
          <div className="orders-management">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3>✅ Delivered Orders</h3>
                  <div style={{ background: '#dcfce7', color: '#166534', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 700 }}>
                      {orders.length} Deliveries | Total: ${(deliveredTotal || 0).toFixed(2)}
                  </div>
              </div>
              {orders.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '3rem', color: '#888' }}>No delivered orders yet.</div>
              ) : (
                  <div className="orders-table-container">
                      <table className="orders-table">
                          <thead>
                              <tr>
                                  <th>Order ID</th>
                                  <th>Items</th>
                                  <th>Address</th>
                                  <th>Driver</th>
                                  <th>Total</th>
                              </tr>
                          </thead>
                          <tbody>
                              {orders.map(order => (
                                  <tr key={order.id}>
                                      <td style={{ fontWeight: 700 }}>#{order.id.slice(-6).toUpperCase()}</td>
                                      <td style={{ fontSize: '0.85rem', color: '#555' }}>
                                          {order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ') || '-'}
                                      </td>
                                      <td style={{ fontSize: '0.85rem' }}>{order.delivery_address}</td>
                                      <td>
                                          <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                                              🚗 {order.driver_name || 'Self-assigned'}
                                          </span>
                                      </td>
                                      <td style={{ fontWeight: 700, color: '#166534' }}>${(order.total || 0).toFixed(2)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
        )
      })() : orders.length === 0 ? (
        <div className="no-orders">
          <p>✨ No {statusFilter} orders at the moment.</p>
        </div>
      ) : (
        <div className="kitchen-orders">
          {orders.map(order => (
            <div key={order.id} className={`kitchen-order-card status-${order.status}`}>
              <div className="order-header-kitchen">
                <div className="order-info">
                  <h3>Order #{order.id.slice(-8).toUpperCase()}</h3>
                  <p className="order-time">
                    🕐 {formatTime(order.created_at)}
                  </p>
                </div>
                <div className="order-actions">
                  {order.status === 'pending' && (
                    <div className="estimated-time-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <label style={{ fontSize: '0.9rem', color: '#555' }}>Est. (min):</label>
                      <input
                        type="number"
                        min="1"
                        style={{ width: '60px', padding: '5px', borderRadius: '4px', border: '1px solid #ddd' }}
                        value={estimatedTimes[order.id] !== undefined ? estimatedTimes[order.id] : 30}
                        onChange={(e) => setEstimatedTimes({ ...estimatedTimes, [order.id]: e.target.value })}
                      />
                      <button
                        className="btn btn-start"
                        onClick={() => updateStatus(order.id, 'preparing')}
                      >
                        👨‍🍳 Start Preparing
                      </button>
                    </div>
                  )}
                  {order.status === 'preparing' && (
                    <button
                      className="btn btn-complete"
                      onClick={() => updateStatus(order.id, 'ready')}
                    >
                      ✅ Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <span className="ready-badge">✅ READY FOR PICKUP</span>
                  )}
                  {order.status === 'delivered' && (
                    <span className="ready-badge" style={{ background: '#9c27b0' }}>🎉 DELIVERED</span>
                  )}
                </div>
              </div>

              <div className="order-items-kitchen">
                <h4>📋 Items:</h4>
                {order.items?.map(item => (
                  <div key={item.id} className="kitchen-item">
                    <span className="item-quantity">{item.quantity}×</span>
                    <span className="item-name">{item.name}</span>
                  </div>
                ))}
              </div>

              <div className="order-delivery-info">
                <p><strong>📍 Delivery:</strong> {order.delivery_address}</p>
                <p><strong>📞 Phone:</strong> {order.delivery_phone}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Kitchen

