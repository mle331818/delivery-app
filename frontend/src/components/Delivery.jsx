import { useState, useEffect } from 'react'
import axios from 'axios'
import './Delivery.css'

function Delivery() {
    const [activeTab, setActiveTab] = useState('ready')
    const [readyOrders, setReadyOrders] = useState([])
    const [myOrders, setMyOrders] = useState([])
    const [deliveredOrders, setDeliveredOrders] = useState([])
    const [loading, setLoading] = useState(true)
    const [claiming, setClaiming] = useState({})

    useEffect(() => {
        loadAll()
        const interval = setInterval(loadAll, 8000)
        return () => clearInterval(interval)
    }, [])

    const loadAll = async () => {
        try {
            const [readyRes, myRes] = await Promise.all([
                axios.get('/api/delivery/ready-orders'),
                axios.get('/api/delivery/orders')
            ])
            setReadyOrders(readyRes.data)
            setMyOrders(myRes.data.filter(o => o.status === 'picked_up'))
            setDeliveredOrders(myRes.data.filter(o => o.status === 'delivered'))
            setLoading(false)
        } catch (err) {
            console.error('Error loading delivery orders:', err)
            setLoading(false)
        }
    }

    const claimOrder = async (orderId) => {
        setClaiming(prev => ({ ...prev, [orderId]: true }))
        try {
            await axios.patch(`/api/delivery/orders/${orderId}/status`, { status: 'picked_up' })
            loadAll()
        } catch (err) {
            alert(err.response?.data?.error || 'Failed to claim order')
        } finally {
            setClaiming(prev => ({ ...prev, [orderId]: false }))
        }
    }

    const markDelivered = async (orderId) => {
        try {
            await axios.patch(`/api/delivery/orders/${orderId}/status`, { status: 'delivered' })
            loadAll()
        } catch (err) {
            alert('Failed to mark as delivered')
        }
    }

    const openMap = (address) => {
        window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`, '_blank')
    }

    if (loading) return <div className="loading">Loading delivery dashboard...</div>

    const tabs = [
        { key: 'ready',     label: '📦 Ready',     count: readyOrders.length,     color: 'tab-ready' },
        { key: 'active',    label: '🚗 On The Way', count: myOrders.length,        color: 'tab-active' },
        { key: 'delivered', label: '✅ Delivered',  count: deliveredOrders.length, color: 'tab-delivered' },
    ]

    const renderCard = (order, section) => (
        <div key={order.id} className={`task-card card-${section}`}>
            <div className="task-header">
                <span className="order-id">#{order.id.slice(-6).toUpperCase()}</span>
                <span className={`status-label status-${order.status}`}>
                    {order.status === 'picked_up' ? 'ON THE WAY' : order.status.toUpperCase()}
                </span>
            </div>

            <div className="customer-details">
                <div className="detail-row">
                    <span className="icon">📍</span>
                    <div className="address-block">
                        <p className="address">{order.delivery_address}</p>
                        {section !== 'delivered' && (
                            <button className="btn-map" onClick={() => openMap(order.delivery_address)}>
                                🗺 Navigate
                            </button>
                        )}
                    </div>
                </div>
                {section !== 'delivered' && (
                    <div className="detail-row">
                        <span className="icon">📞</span>
                        <a href={`tel:${order.delivery_phone}`} className="phone-link">
                            {order.delivery_phone}
                        </a>
                    </div>
                )}
            </div>

            <div className="order-summary">
                <h4>📋 Items</h4>
                <p>{order.items?.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p>
                <p className="total">
                    💰 {section === 'delivered' ? 'Collected:' : 'Collect:'} ${order.total?.toFixed(2)}
                    {section === 'delivered' && <span className="collected-tag"> ✓</span>}
                </p>
            </div>

            {section === 'ready' && (
                <div className="action-buttons">
                    <button
                        className="btn-action pickup"
                        disabled={claiming[order.id]}
                        onClick={() => claimOrder(order.id)}
                    >
                        {claiming[order.id] ? '⏳ Claiming...' : '📦 Take This Order'}
                    </button>
                </div>
            )}

            {section === 'active' && (
                <div className="action-buttons">
                    <button className="btn-action complete" onClick={() => markDelivered(order.id)}>
                        ✅ Mark as Delivered
                    </button>
                </div>
            )}
        </div>
    )

    const currentOrders =
        activeTab === 'ready'     ? readyOrders :
        activeTab === 'active'    ? myOrders :
        deliveredOrders

    const emptyMessages = {
        ready:     'No orders ready for pickup right now.',
        active:    'No active deliveries. Pick up an order!',
        delivered: 'No deliveries completed yet.',
    }

    return (
        <div className="delivery-page">
            {/* ── Header ── */}
            <div className="delivery-header">
                <h2>🛵 Delivery Dashboard</h2>
            </div>

            {/* ── Tab Nav ── */}
            <div className="delivery-tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        className={`delivery-tab ${tab.color} ${activeTab === tab.key ? 'tab-active-state' : ''}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        <span className="tab-label">{tab.label}</span>
                        <span className="tab-badge">{tab.count}</span>
                    </button>
                ))}
            </div>

            {/* ── Content ── */}
            <div className="tab-content">
                {currentOrders.length === 0 ? (
                    <div className="empty-section">
                        <div className="empty-icon">
                            {activeTab === 'ready' ? '📭' : activeTab === 'active' ? '🚗' : '🎉'}
                        </div>
                        <p>{emptyMessages[activeTab]}</p>
                    </div>
                ) : (
                    <div className="tasks-list">
                        {currentOrders.map(order => renderCard(order, activeTab))}
                    </div>
                )}
            </div>
        </div>
    )
}

export default Delivery
