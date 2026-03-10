import { useState, useEffect } from 'react'
import axios from 'axios'
import './Admin.css'

function Admin() {
    const [activeTab, setActiveTab] = useState('overview')
    const [orders, setOrders] = useState([])
    const [drivers, setDrivers] = useState([])
    const [customers, setCustomers] = useState([])
    const [menuItems, setMenuItems] = useState([])
    const [categories, setCategories] = useState([])
    const [loyaltyRate, setLoyaltyRate] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Form States
    const [newDriver, setNewDriver] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: 'cat1', imageUrl: '' })
    const [promos, setPromos] = useState([])
    const [newPromo, setNewPromo] = useState({ code: '', discount: '' })
    const [newStaff, setNewStaff] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'delivery' })

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 10000)
        return () => clearInterval(interval)
    }, [])

    const loadData = async () => {
        try {
            const [ordersRes, staffRes, menuRes, catRes, promoRes, custRes, settingsRes] = await Promise.all([
                axios.get('/api/admin/orders'),
                axios.get('/api/admin/staff'),
                axios.get('/api/menu/items'),
                axios.get('/api/menu/categories'),
                axios.get('/api/admin/promos'),
                axios.get('/api/admin/customers'),
                axios.get('/api/admin/settings')
            ])
            setOrders(ordersRes.data)
            setDrivers(staffRes.data) // active drivers/staff
            setMenuItems(menuRes.data)
            setCategories(catRes.data)
            setPromos(promoRes.data)
            setCustomers(custRes.data)
            setLoyaltyRate(settingsRes.data.loyaltyRate || 1)
            setLoading(false)
        } catch (err) {
            console.error('Error loading admin data:', err)
            setError('Failed to load dashboard data')
            setLoading(false)
        }
    }

    const assignDriver = async (orderId, driverId) => {
        try {
            await axios.patch(`/api/admin/orders/${orderId}/assign`, { driverId })
            loadData()
        } catch (err) {
            alert('Failed to assign driver')
        }
    }

    const handleAddDriver = async (e) => {
        e.preventDefault()
        try {
            await axios.post('/api/admin/drivers', newDriver)
            alert('Driver created successfully!')
            setNewDriver({ firstName: '', lastName: '', email: '', phone: '', password: '' })
            loadData()
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleAddItem = async (e) => {
        e.preventDefault()
        try {
            await axios.post('/api/admin/menu', newItem)
            alert('Menu item added!')
            setNewItem({ name: '', description: '', price: '', categoryId: categories[0]?.id || '', imageUrl: '' })
            loadData()
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleDeleteItem = async (id) => {
        if (!window.confirm('Delete this item?')) return
        try {
            await axios.delete(`/api/admin/menu/${id}`)
            loadData()
        } catch (err) {
            alert('Failed to delete item')
        }
    }

    const handleAddStaff = async (e) => {
        e.preventDefault()
        try {
            await axios.post('/api/admin/staff', newStaff)
            alert('Staff member added!')
            setNewStaff({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'delivery' })
            loadData()
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message))
        }
    }

    const handleAddPromo = async (e) => {
        e.preventDefault()
        try {
            await axios.post('/api/admin/promos', {
                code: newPromo.code,
                discountPercent: parseInt(newPromo.discount)
            })
            alert('Promo code created!')
            setNewPromo({ code: '', discount: '' })
            loadData()
        } catch (err) {
            alert('Error adding promo')
        }
    }

    const handleUpdateLoyalty = async (userId, newPoints) => {
        const points = parseInt(newPoints);
        if (isNaN(points)) return;
        try {
            await axios.patch(`/api/admin/users/${userId}/loyalty`, { points });
            loadData();
        } catch (err) {
            alert('Failed to update points');
        }
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount)
    }

    if (loading) return <div className="loading">Loading admin dashboard...</div>
    // if (error) return <div className="error">{error}</div>

    // Calculate stats
    const totalSales = orders
        .filter(o => o.status !== 'cancelled')
        .reduce((sum, o) => sum + o.total, 0)

    const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready', 'picked_up'].includes(o.status)).length

    // Analytics helper
    const getLast7DaysSales = () => {
        const days = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setUTCHours(d.getUTCHours() + 2);
            d.setUTCDate(d.getUTCDate() - i);
            days[d.toLocaleDateString('en-US', { timeZone: 'UTC' })] = 0;
        }
        orders.forEach(o => {
            if (!o.created_at) return;
            try {
                const isSQLiteFormat = typeof o.created_at === 'string' && !o.created_at.includes('T') && !o.created_at.includes('Z');
                const isoString = isSQLiteFormat ? o.created_at.replace(' ', 'T') + 'Z' : o.created_at;
                const d = new Date(isoString);
                d.setUTCHours(d.getUTCHours() + 2);
                const dateStr = d.toLocaleDateString('en-US', { timeZone: 'UTC' });
                if (days[dateStr] !== undefined) days[dateStr] += (o.total || 0);
            } catch (e) { /* ignore invalid dates */ }
        });
        return Object.entries(days).map(([date, total]) => ({ date: date.slice(0, 5), total }));
    }

    const chartData = getLast7DaysSales();
    const maxSale = Math.max(...chartData.map(d => d.total), 100);

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h2>👑 Admin Dashboard</h2>
                <div className="admin-tabs">
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
                    <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Orders</button>
                    <button className={activeTab === 'delivered' ? 'active' : ''} onClick={() => setActiveTab('delivered')}>✅ Delivered</button>
                    <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => setActiveTab('menu')}>Menu</button>
                    <button className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Staff</button>
                    <button className={activeTab === 'customers' ? 'active' : ''} onClick={() => setActiveTab('customers')}>Customers</button>
                    <button className={activeTab === 'promos' ? 'active' : ''} onClick={() => setActiveTab('promos')}>Promos</button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
                </div>
            </div>

            {activeTab === 'overview' && (
                <div className="stats-container-col">
                    <div className="stats-container">
                        <div className="stat-card">
                            <h3>Total Sales</h3>
                            <p>{formatCurrency(totalSales)}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Active Orders</h3>
                            <p>{activeOrders}</p>
                        </div>
                        <div className="stat-card">
                            <h3>Active Staff</h3>
                            <p>{drivers.length}</p>
                        </div>
                    </div>

                    <div className="card chart-card">
                        <h3>Sales (Last 7 Days)</h3>
                        <div className="chart-bar-container">
                            {chartData.map((d, i) => (
                                <div key={i} className="chart-bar-col">
                                    <div className="bar-fill" style={{ height: `${(d.total / maxSale) * 100}%` }} title={formatCurrency(d.total)}></div>
                                    <span className="bar-label">{d.date}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'orders' && (
                <div className="orders-management">
                    <h3>Order Management</h3>
                    <div className="orders-table-container">
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Order ID</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Driver</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orders.map(order => (
                                    <tr key={order.id}>
                                        <td>#{order.id.slice(-6)}</td>
                                        <td><span className={`status-badge ${order.status}`}>{order.status.replace('_', ' ')}</span></td>
                                        <td>{formatCurrency(order.total)}</td>
                                        <td>
                                            {(order.status === 'ready' || order.status === 'preparing') ? (
                                                <select
                                                    value={order.driver_id || ''}
                                                    onChange={(e) => assignDriver(order.id, e.target.value)}
                                                    className="driver-select"
                                                >
                                                    <option value="">Select Driver</option>
                                                    {drivers.filter(d => d.role === 'delivery').map(driver => (
                                                        <option key={driver.id} value={driver.id}>{driver.first_name} {driver.last_name}</option>
                                                    ))}
                                                </select>
                                            ) : order.driver_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'delivered' && (() => {
                const deliveredOrders = orders.filter(o => o.status === 'delivered')
                const deliveredTotal = deliveredOrders.reduce((sum, o) => sum + (o.total || 0), 0)
                return (
                    <div className="orders-management">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3>✅ Delivered Orders</h3>
                            <div style={{ background: '#dcfce7', color: '#166534', padding: '0.4rem 1rem', borderRadius: '8px', fontWeight: 700 }}>
                                {deliveredOrders.length} Deliveries | Total: {formatCurrency(deliveredTotal)}
                            </div>
                        </div>
                        {deliveredOrders.length === 0 ? (
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
                                        {deliveredOrders.map(order => (
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
                                                <td style={{ fontWeight: 700, color: '#166534' }}>{formatCurrency(order.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )
            })()}

            {activeTab === 'menu' && (
                <div className="menu-management">
                    <div className="split-view">
                        <div className="card form-card">
                            <h3>Add Menu Item</h3>
                            <form onSubmit={handleAddItem}>
                                <div className="form-group">
                                    <label>Name</label>
                                    <input type="text" required value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea required value={newItem.description} onChange={e => setNewItem({ ...newItem, description: e.target.value })} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Price ($)</label>
                                        <input type="number" step="0.01" required value={newItem.price} onChange={e => setNewItem({ ...newItem, price: parseFloat(e.target.value) })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Category</label>
                                        <select value={newItem.categoryId} onChange={e => setNewItem({ ...newItem, categoryId: e.target.value })}>
                                            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="btn btn-primary">Add Item</button>
                            </form>
                        </div>

                        <div className="card list-card">
                            <h3>Existing Items</h3>
                            <div className="simple-list">
                                {menuItems.map(item => (
                                    <div key={item.id} className="list-item">
                                        <div>
                                            <strong>{item.name}</strong> - {formatCurrency(item.price)}
                                        </div>
                                        <button className="btn-small-danger" onClick={() => handleDeleteItem(item.id)}>Delete</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'staff' && (
                <div className="driver-management">
                    <div className="split-view">
                        <div className="card form-card">
                            <h3>Add Staff Member</h3>
                            <form onSubmit={handleAddStaff}>
                                <div className="form-group">
                                    <label>Role</label>
                                    <select value={newStaff.role} onChange={e => setNewStaff({ ...newStaff, role: e.target.value })} style={{ width: '100%', padding: '0.75rem' }}>
                                        <option value="delivery">Delivery Driver</option>
                                        <option value="kitchen">Kitchen Staff</option>
                                    </select>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name</label>
                                        <input type="text" required value={newStaff.firstName} onChange={e => setNewStaff({ ...newStaff, firstName: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name</label>
                                        <input type="text" required value={newStaff.lastName} onChange={e => setNewStaff({ ...newStaff, lastName: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" required value={newStaff.email} onChange={e => setNewStaff({ ...newStaff, email: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Phone</label>
                                    <input type="tel" required value={newStaff.phone} onChange={e => setNewStaff({ ...newStaff, phone: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Password</label>
                                    <input type="password" required value={newStaff.password} onChange={e => setNewStaff({ ...newStaff, password: e.target.value })} />
                                </div>
                                <button type="submit" className="btn btn-primary">Create Account</button>
                            </form>
                        </div>

                        <div className="card list-card">
                            <h3>Our Team</h3>
                            <div className="simple-list">
                                {drivers.map(s => (
                                    <div key={s.id} className="list-item">
                                        <div className="driver-info-block">
                                            <strong>{s.first_name} {s.last_name}</strong>
                                            <span className="sub-text">{s.email} | {s.phone}</span>
                                        </div>
                                        <span className={`badge-active ${s.role === 'kitchen' ? 'kitchen-badge' : ''}`}>{s.role}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'customers' && (
                <div className="customers-management">
                    <h3>Customer Loyalty Management</h3>
                    <div className="card list-card" style={{ maxWidth: '800px' }}>
                        <table className="orders-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Email</th>
                                    <th>Loyalty Points</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {customers.map(c => (
                                    <tr key={c.id}>
                                        <td>{c.first_name} {c.last_name || ''}</td>
                                        <td>{c.email}</td>
                                        <td>
                                            <span className="loyalty-badge">💎 {c.loyalty_points || 0}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '5px' }}>
                                                <button className="btn-small" onClick={() => handleUpdateLoyalty(c.id, (c.loyalty_points || 0) + 10)}>+10</button>
                                                <button className="btn-small-danger" onClick={() => handleUpdateLoyalty(c.id, Math.max(0, (c.loyalty_points || 0) - 10))}>-10</button>
                                                <button className="btn-small" onClick={() => {
                                                    const p = prompt('Set points for ' + c.email, c.loyalty_points || 0);
                                                    if (p !== null) handleUpdateLoyalty(c.id, p);
                                                }}>Edit</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'promos' && (
                <div className="promo-management">
                    <div className="split-view">
                        <div className="card form-card">
                            <h3>Create Promo Code</h3>
                            <form onSubmit={handleAddPromo}>
                                <div className="form-group">
                                    <label>Code (e.g. SAVE20)</label>
                                    <input type="text" required value={newPromo.code} onChange={e => setNewPromo({ ...newPromo, code: e.target.value })} />
                                </div>
                                <div className="form-group">
                                    <label>Discount Percentage (%)</label>
                                    <input type="number" min="1" max="100" required value={newPromo.discount} onChange={e => setNewPromo({ ...newPromo, discount: e.target.value })} />
                                </div>
                                <button type="submit" className="btn btn-primary">Create Code</button>
                            </form>
                        </div>
                        <div className="card list-card">
                            <h3>Active Promos</h3>
                            <div className="simple-list">
                                {promos.map(p => (
                                    <div key={p.id} className="list-item">
                                        <div>
                                            <strong>{p.code}</strong>
                                            <br />
                                            <span className="sub-text">{p.discount_percent}% Off</span>
                                        </div>
                                        <span className="badge-active">Active</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <div className="settings-page">
                    <h3>Global Settings</h3>
                    <div className="card form-card" style={{ maxWidth: '600px' }}>
                        <div className="form-group">
                            <label>Loyalty Points Earn Rate (Points per $1)</label>
                            <input
                                type="number"
                                step="0.1"
                                min="0"
                                value={loyaltyRate}
                                onChange={(e) => setLoyaltyRate(e.target.value)}
                            />
                            <p className="hint">1 = 1 point per $1. 2 = 2 points per $1.</p>
                        </div>

                        <div style={{ background: '#f8f9fa', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                            <h4>📝 Calculation Preview</h4>
                            <p>With a rate of <strong>{loyaltyRate || 0}</strong> points/$:</p>
                            <ul>
                                <li>Order of <strong>$10.00</strong> earns <strong>{Math.floor(10 * (loyaltyRate || 0))}</strong> points</li>
                                <li>Order of <strong>$50.00</strong> earns <strong>{Math.floor(50 * (loyaltyRate || 0))}</strong> points</li>
                                <li>Order of <strong>$100.00</strong> earns <strong>{Math.floor(100 * (loyaltyRate || 0))}</strong> points</li>
                            </ul>
                        </div>

                        <button className="btn btn-primary" onClick={async () => {
                            try {
                                await axios.post('/api/admin/settings', { loyaltyRate });
                                alert('Settings saved!');
                            } catch (e) { alert('Failed to save settings'); }
                        }}>Save Settings</button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default Admin
