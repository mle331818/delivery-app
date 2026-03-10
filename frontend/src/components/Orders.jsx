import { useState, useEffect } from 'react'
import axios from 'axios'
import './Orders.css'

function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axios.get('/api/orders/my-orders')
      .then(res => {
        setOrders(res.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading orders:', err)
        setLoading(false)
      })
  }, [])

  const getStatusColor = (status) => {
    const colors = {
      pending: '#ff9800',
      confirmed: '#2196f3',
      preparing: '#ff5722',
      ready: '#4caf50',
      out_for_delivery: '#9c27b0',
      delivered: '#2e7d32',
      cancelled: '#f44336'
    }
    return colors[status] || '#666'
  }

  const formatAdjustedTime = (dateString, isTimeOnly = false) => {
    if (!dateString) return '';
    const isSQLiteFormat = typeof dateString === 'string' && !dateString.includes('T') && !dateString.includes('Z');
    const isoString = isSQLiteFormat ? dateString.replace(' ', 'T') + 'Z' : dateString;
    const date = new Date(isoString);
    // Explicitly adjust time +2 hours and lock display to UTC to ensure +2 shift is honored exactly
    date.setUTCHours(date.getUTCHours() + 2);
    const options = isTimeOnly 
      ? { hour: '2-digit', minute: '2-digit' } 
      : { month: 'numeric', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    return date.toLocaleString('en-US', { timeZone: 'UTC', ...options });
  }

  if (loading) {
    return <div className="loading">Loading your orders...</div>
  }

  return (
    <div className="orders-page">
      <h2>My Orders</h2>

      {orders.length === 0 ? (
        <div className="no-orders">
          <p>You haven't placed any orders yet.</p>
          <a href="/" className="btn btn-primary">Browse Menu</a>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map(order => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <h3>Order #{order.id.slice(-8)}</h3>
                  <p className="order-date">
                    {formatAdjustedTime(order.created_at)}
                  </p>
                  {order.estimated_delivery_time && !['delivered', 'cancelled', 'pending'].includes(order.status) && (
                    <div className="order-estimated-time">
                      <span>⏳</span>
                      <span>Est. Delivery: {formatAdjustedTime(order.estimated_delivery_time, true)}</span>
                    </div>
                  )}
                </div>
                <div className="order-status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(order.status) }}
                  >
                    {order.status.replace('_', ' ').toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="order-items">
                {order.items?.map(item => (
                  <div key={item.id} className="order-item">
                    <span>{item.name} x {item.quantity}</span>
                    <span>${(item.price_at_time * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="order-footer">
                <div className="order-address">
                  <strong>Delivery to:</strong> {order.delivery_address}
                </div>
                <div className="order-total">
                  <strong>Total: ${parseFloat(order.total).toFixed(2)}</strong>
                  {order.points_awarded > 0 && (
                    <div style={{ color: '#e8a13a', fontSize: '0.9rem', marginTop: '0.2rem' }}>
                      💎 +{order.points_awarded} Points
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Orders



