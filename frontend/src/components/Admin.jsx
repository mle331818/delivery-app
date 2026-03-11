import { useState, useEffect } from 'react'
import axios from 'axios'
import './Admin.css'
import './POS.css'

function Admin() {
    const [activeTab, setActiveTab] = useState('pos')
    const [orders, setOrders] = useState([])
    const [drivers, setDrivers] = useState([])
    const [customers, setCustomers] = useState([])
    const [menuItems, setMenuItems] = useState([])
    const [categories, setCategories] = useState([])
    const [transactions, setTransactions] = useState([])
    const [loyaltyRate, setLoyaltyRate] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    // Form States
    const [newDriver, setNewDriver] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' })
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', categoryId: 'cat1', imageUrl: '' })
    const [promos, setPromos] = useState([])
    const [newPromo, setNewPromo] = useState({ code: '', discount: '' })
    const [newTransaction, setNewTransaction] = useState({ type: 'expense', amount: '', description: '' })
    const [newStaff, setNewStaff] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'delivery', salary: '' })

    // Staff modal state
    const [staffModal, setStaffModal] = useState(null) // null | { mode: 'edit'|'delete', staff: {...} }
    const [staffModalForm, setStaffModalForm] = useState({ firstName: '', lastName: '', email: '', phone: '', role: 'delivery', salary: '', password: '', adminPassword: '' })
    const [staffModalError, setStaffModalError] = useState('')
    const [staffModalLoading, setStaffModalLoading] = useState(false)

    // POS State
    const [posTable, setPosTable] = useState('Table 1')
    const [posCart, setPosCart] = useState([]) // [{menuItemId, name, price, quantity}]
    const [posActiveCategory, setPosActiveCategory] = useState('')
    const [posInvoice, setPosInvoice] = useState(null) // order for invoice modal
    const [posLoading, setPosLoading] = useState(false)
    const [posError, setPosError] = useState('')
    const [openTables, setOpenTables] = useState([]) // POS orders
    const [posPayLoading, setPosPayLoading] = useState('')  // orderId being paid
    const [posPeriod, setPosPeriod] = useState('day') // 'day' | 'week' | 'month' | 'all'

    useEffect(() => {
        loadData()
        const interval = setInterval(loadData, 10000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        axios.get(`/api/admin/open-tables?period=${posPeriod}`)
            .then(r => setOpenTables(Array.isArray(r.data) ? r.data : []))
            .catch(() => setOpenTables([]))
    }, [posPeriod])

    const loadData = async () => {
        try {
            const [ordersRes, staffRes, menuRes, catRes, promoRes, custRes, txRes, settingsRes] = await Promise.all([
                axios.get('/api/admin/orders'),
                axios.get('/api/admin/staff'),
                axios.get('/api/menu/items'),
                axios.get('/api/menu/categories'),
                axios.get('/api/admin/promos'),
                axios.get('/api/admin/customers'),
                axios.get('/api/admin/transactions'),
                axios.get('/api/admin/settings')
            ])
            setOrders(ordersRes.data)
            setDrivers(staffRes.data) // active drivers/staff
            setMenuItems(menuRes.data)
            setCategories(catRes.data)
            setPromos(promoRes.data)
            setCustomers(custRes.data)
            setTransactions(txRes.data)
            setLoyaltyRate(settingsRes.data.loyaltyRate || 1)
            // Fetch POS orders (all, paid + pending)
            try {
                const openRes = await axios.get(`/api/admin/open-tables?period=${posPeriod}`)
                setOpenTables(Array.isArray(openRes.data) ? openRes.data : [])
            } catch (_) { setOpenTables([]) }
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
            setNewStaff({ firstName: '', lastName: '', email: '', phone: '', password: '', role: 'delivery', salary: '' })
            loadData()
        } catch (err) {
            alert('Error: ' + (err.response?.data?.error || err.message))
        }
    }

    const openEditModal = (staff) => {
        setStaffModal({ mode: 'edit', staff })
        setStaffModalForm({
            firstName: staff.first_name,
            lastName: staff.last_name,
            email: staff.email,
            phone: staff.phone || '',
            role: staff.role,
            salary: staff.salary || 0,
            password: '',
            adminPassword: ''
        })
        setStaffModalError('')
    }

    const openDeleteModal = (staff) => {
        setStaffModal({ mode: 'delete', staff })
        setStaffModalForm({ ...staffModalForm, adminPassword: '' })
        setStaffModalError('')
    }

    const closeStaffModal = () => {
        setStaffModal(null)
        setStaffModalError('')
        setStaffModalLoading(false)
    }

    const submitStaffModal = async (e) => {
        e.preventDefault()
        setStaffModalError('')
        setStaffModalLoading(true)
        try {
            if (staffModal.mode === 'delete') {
                await axios.delete(`/api/admin/staff/${staffModal.staff.id}`, {
                    data: { adminPassword: staffModalForm.adminPassword }
                })
                closeStaffModal()
                loadData()
            } else {
                await axios.put(`/api/admin/staff/${staffModal.staff.id}`, {
                    firstName: staffModalForm.firstName,
                    lastName: staffModalForm.lastName,
                    email: staffModalForm.email,
                    phone: staffModalForm.phone,
                    role: staffModalForm.role,
                    salary: parseFloat(staffModalForm.salary) || 0,
                    password: staffModalForm.password,
                    adminPassword: staffModalForm.adminPassword
                })
                closeStaffModal()
                loadData()
            }
        } catch (err) {
            setStaffModalError(err.response?.data?.error || err.message)
        }
        setStaffModalLoading(false)
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

    const handleAddTransaction = async (e) => {
        e.preventDefault()
        try {
            await axios.post('/api/admin/transactions', {
                type: newTransaction.type,
                amount: parseFloat(newTransaction.amount),
                description: newTransaction.description
            })
            alert('Transaction added!')
            setNewTransaction({ type: 'expense', amount: '', description: '' })
            loadData()
        } catch (err) {
            alert('Error adding transaction')
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

    const posAddToCart = (item) => {
        setPosCart(prev => {
            const existing = prev.find(c => c.menuItemId === item.id)
            if (existing) {
                return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c)
            }
            return [...prev, { menuItemId: item.id, name: item.name, price: parseFloat(item.price), quantity: 1 }]
        })
    }

    const posUpdateQty = (menuItemId, delta) => {
        setPosCart(prev => prev
            .map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity + delta } : c)
            .filter(c => c.quantity > 0)
        )
    }

    const posPlaceOrder = async () => {
        if (posCart.length === 0) return
        setPosLoading(true)
        setPosError('')
        try {
            const res = await axios.post('/api/admin/pos-order', {
                tableName: posTable,
                items: posCart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity }))
            })
            setPosInvoice({ ...res.data.order, cartSnapshot: posCart, tableName: posTable })
            setPosCart([])
            loadData()
        } catch (err) {
            setPosError(err.response?.data?.error || err.message)
        }
        setPosLoading(false)
    }

    const posPrint = () => {
        window.print()
    }

    const posPayOrder = async (orderId) => {
        setPosPayLoading(orderId)
        try {
            await axios.patch(`/api/admin/pos-order/${orderId}`)
            loadData()
            // If the invoice modal was showing this order, close it
            if (posInvoice && posInvoice.id === orderId) setPosInvoice(null)
        } catch (err) {
            alert('Error marking as paid: ' + (err.response?.data?.error || err.message))
        }
        setPosPayLoading('')
    }

    const posSubtotal = posCart.reduce((s, c) => s + c.price * c.quantity, 0)
    const posTax = posSubtotal * 0.08
    const posTotal = posSubtotal + posTax

    const posFilteredItems = posActiveCategory
        ? menuItems.filter(i => i.category_id === posActiveCategory)
        : menuItems

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
        <>
        <div className="admin-page">
            <div className="admin-header">
                <h2>👑 Admin Dashboard</h2>
                <div className="admin-tabs">
                    <button className={activeTab === 'pos' ? 'active' : ''} onClick={() => setActiveTab('pos')}>🧾 POS</button>
                    <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>📊 Overview</button>
                    <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>Orders</button>
                    <button className={activeTab === 'delivered' ? 'active' : ''} onClick={() => setActiveTab('delivered')}>✅ Delivered</button>
                    <button className={activeTab === 'menu' ? 'active' : ''} onClick={() => setActiveTab('menu')}>Menu</button>
                    <button className={activeTab === 'staff' ? 'active' : ''} onClick={() => setActiveTab('staff')}>Staff</button>
                    <button className={activeTab === 'customers' ? 'active' : ''} onClick={() => setActiveTab('customers')}>Customers</button>
                    <button className={activeTab === 'finances' ? 'active' : ''} onClick={() => setActiveTab('finances')}>Finances</button>
                    <button className={activeTab === 'promos' ? 'active' : ''} onClick={() => setActiveTab('promos')}>Promos</button>
                    <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
                </div>
            </div>

            {activeTab === 'pos' && (
                <>
                <div className="pos-container">
                    {/* LEFT: Menu Panel */}
                    <div className="pos-menu-panel">
                        <div className="pos-category-bar">
                            <button
                                className={`pos-category-btn${posActiveCategory === '' ? ' active' : ''}`}
                                onClick={() => setPosActiveCategory('')}
                            >All</button>
                            {categories.map(cat => (
                                <button
                                    key={cat.id}
                                    className={`pos-category-btn${posActiveCategory === cat.id ? ' active' : ''}`}
                                    onClick={() => setPosActiveCategory(cat.id)}
                                >{cat.name}</button>
                            ))}
                        </div>

                        <div className="pos-menu-grid">
                            {posFilteredItems.filter(i => i.is_available).map(item => (
                                <div key={item.id} className="pos-menu-item" onClick={() => posAddToCart(item)}>
                                    <button className="pos-add-btn" onClick={e => { e.stopPropagation(); posAddToCart(item); }}>+</button>
                                    <span className="pos-menu-item-name">{item.name}</span>
                                    <span className="pos-menu-item-desc">{item.description}</span>
                                    <span className="pos-menu-item-price">{formatCurrency(parseFloat(item.price))}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT: Order Panel */}
                    <div className="pos-order-panel">
                        <div className="pos-order-header">
                            <h3>🧾 Current Order</h3>
                            <select className="pos-table-select" value={posTable} onChange={e => setPosTable(e.target.value)}>
                                {Array.from({ length: 20 }, (_, i) => `Table ${i + 1}`).map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                                <option value="Bar">Bar</option>
                                <option value="Takeaway">Takeaway</option>
                            </select>
                        </div>

                        <div className="pos-order-items">
                            {posCart.length === 0 ? (
                                <div className="pos-empty-msg">🍽️ Tap items on the left to add them</div>
                            ) : posCart.map(item => (
                                <div key={item.menuItemId} className="pos-order-row">
                                    <div className="pos-order-row-name">{item.name}</div>
                                    <button className="pos-qty-btn" onClick={() => posUpdateQty(item.menuItemId, -1)}>−</button>
                                    <span className="pos-qty-num">{item.quantity}</span>
                                    <button className="pos-qty-btn" onClick={() => posUpdateQty(item.menuItemId, 1)}>+</button>
                                    <div className="pos-order-row-price">{formatCurrency(item.price * item.quantity)}</div>
                                    <button className="pos-remove-btn" onClick={() => setPosCart(p => p.filter(c => c.menuItemId !== item.menuItemId))}>✕</button>
                                </div>
                            ))}
                        </div>

                        <div className="pos-order-footer">
                            {posError && <p style={{ color: '#c62828', fontSize: '0.85rem', marginBottom: '0.5rem' }}>⚠️ {posError}</p>}
                            <div className="pos-totals">
                                <div className="pos-total-row"><span>Subtotal</span><span>{formatCurrency(posSubtotal)}</span></div>
                                <div className="pos-total-row"><span>Tax (8%)</span><span>{formatCurrency(posTax)}</span></div>
                                <div className="pos-total-row grand"><span>Total</span><span>{formatCurrency(posTotal)}</span></div>
                            </div>
                            <div className="pos-actions">
                                <button className="pos-btn-clear" onClick={() => setPosCart([])}>Clear</button>
                                <button
                                    className="pos-btn-place"
                                    disabled={posCart.length === 0 || posLoading}
                                    onClick={posPlaceOrder}
                                >
                                    {posLoading ? 'Placing...' : '✅ Place Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Open Bills */}
                <div style={{ marginTop: '1.75rem' }}>
                    {/* Section Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <h3 style={{ margin: 0, fontWeight: 900, color: '#1a1a1a', fontSize: '1.15rem', letterSpacing: '-0.3px' }}>🧾 Bills</h3>

                        {/* Period Filter */}
                        <div style={{ display: 'flex', gap: '4px', background: '#f0f0f0', borderRadius: '10px', padding: '3px' }}>
                            {[['day', 'Today'], ['week', 'This Week'], ['month', 'This Month'], ['all', 'All Time']].map(([val, label]) => (
                                <button key={val} onClick={() => setPosPeriod(val)} style={{
                                    padding: '5px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                                    fontWeight: 700, fontSize: '0.78rem', transition: 'all 0.15s',
                                    background: posPeriod === val ? '#c62828' : 'transparent',
                                    color: posPeriod === val ? '#fff' : '#666',
                                }}>{label}</button>
                            ))}
                        </div>

                        <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', fontSize: '0.82rem', color: '#888' }}>
                            <span>Total: <strong style={{ color: '#1a1a1a' }}>{openTables.length}</strong></span>
                            <span>Unpaid: <strong style={{ color: '#c62828' }}>{formatCurrency(openTables.filter(o => o.payment_status === 'pending').reduce((s, o) => s + o.total, 0))}</strong></span>
                            <span>Collected: <strong style={{ color: '#2e7d32' }}>{formatCurrency(openTables.filter(o => o.payment_status === 'paid').reduce((s, o) => s + o.total, 0))}</strong></span>
                        </div>
                    </div>

                    {openTables.length === 0 ? (
                        <div style={{ background: '#fff', borderRadius: '16px', padding: '3rem', textAlign: 'center', color: '#bbb', border: '1px solid #f0f0f0', fontSize: '0.9rem' }}>
                            No POS orders for this period.
                        </div>
                    ) : (
                        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden', border: '1px solid #efefef' }}>
                            {/* Column Headers */}
                            <div style={{
                                display: 'grid', gridTemplateColumns: '150px 1fr 100px 80px 190px',
                                padding: '0.6rem 1.5rem', background: '#f8f8f8',
                                borderBottom: '2px solid #f0f0f0',
                                fontSize: '0.72rem', fontWeight: 700, color: '#aaa',
                                textTransform: 'uppercase', letterSpacing: '0.6px'
                            }}>
                                <span>Table / Time</span>
                                <span>Items Ordered</span>
                                <span style={{ textAlign: 'right' }}>Total</span>
                                <span style={{ textAlign: 'center' }}>Status</span>
                                <span style={{ textAlign: 'right' }}>Actions</span>
                            </div>

                            {/* Rows */}
                            {openTables.map((order, idx) => {
                                const isPaid = order.payment_status === 'paid'
                                return (
                                    <div key={order.id}
                                        style={{
                                            display: 'grid', gridTemplateColumns: '150px 1fr 100px 80px 190px',
                                            alignItems: 'center',
                                            padding: '0.9rem 1.5rem',
                                            borderBottom: idx < openTables.length - 1 ? '1px solid #f5f5f5' : 'none',
                                            background: isPaid ? '#fafff8' : '#fff',
                                            transition: 'background 0.15s',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.background = isPaid ? '#f2fdf0' : '#f8f8ff'}
                                        onMouseLeave={e => e.currentTarget.style.background = isPaid ? '#fafff8' : '#fff'}
                                    >
                                        {/* Table + date/time */}
                                        <div>
                                            <div style={{ fontWeight: 800, fontSize: '0.93rem', color: '#1a1a1a' }}>
                                                🪑 {order.table_name || order.delivery_address?.replace(' - Dine In', '')}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: '#bbb', marginTop: '2px' }}>
                                                {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                {' '}·{' '}
                                                {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>

                                        {/* Item chips */}
                                        <div style={{ paddingRight: '1rem', display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                            {(order.items || []).map((item, i) => (
                                                <span key={i} style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: '3px',
                                                    background: '#f3f4f6', borderRadius: '6px', padding: '2px 8px',
                                                    fontSize: '0.76rem', fontWeight: 600, color: '#444',
                                                }}>
                                                    <span style={{ color: '#c62828', fontWeight: 800 }}>×{item.quantity}</span>
                                                    {item.name}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Total */}
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 900, fontSize: '0.97rem', color: '#111' }}>{formatCurrency(order.total)}</div>
                                            <div style={{ fontSize: '0.68rem', color: '#ccc' }}>incl. tax</div>
                                        </div>

                                        {/* Status badge */}
                                        <div style={{ textAlign: 'center' }}>
                                            {isPaid ? (
                                                <span style={{ background: '#dcfce7', color: '#166534', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✅ Paid</span>
                                            ) : (
                                                <span style={{ background: '#fff7ed', color: '#c2410c', borderRadius: '20px', padding: '3px 10px', fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap' }}>⏳ Pending</span>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                            {/* Invoice / Reprint always available */}
                                            <button
                                                onClick={() => setPosInvoice({ ...order, cartSnapshot: order.items?.map(i => ({ ...i, price: i.price_at_time })) })}
                                                style={{ padding: '6px 12px', background: '#EFF6FF', color: '#1d4ed8', border: '1.5px solid #BFDBFE', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                                                onMouseEnter={e => { e.target.style.background = '#1d4ed8'; e.target.style.color = '#fff'; }}
                                                onMouseLeave={e => { e.target.style.background = '#EFF6FF'; e.target.style.color = '#1d4ed8'; }}
                                            >🖨️ {isPaid ? 'Reprint' : 'Invoice'}</button>

                                            {/* Mark Paid — only for pending */}
                                            {!isPaid && (
                                                <button
                                                    onClick={() => posPayOrder(order.id)}
                                                    disabled={posPayLoading === order.id}
                                                    style={{ padding: '6px 12px', background: posPayLoading === order.id ? '#e5e7eb' : '#F0FDF4', color: posPayLoading === order.id ? '#9ca3af' : '#15803d', border: '1.5px solid #BBF7D0', borderRadius: '8px', fontWeight: 700, cursor: posPayLoading === order.id ? 'not-allowed' : 'pointer', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                                                    onMouseEnter={e => { if (posPayLoading !== order.id) { e.target.style.background = '#15803d'; e.target.style.color = '#fff'; }}}
                                                    onMouseLeave={e => { if (posPayLoading !== order.id) { e.target.style.background = '#F0FDF4'; e.target.style.color = '#15803d'; }}}
                                                >{posPayLoading === order.id ? '⏳…' : '✅ Mark Paid'}</button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
                </>
            )}
            )}
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
                                    <label>Initial Salary ($)</label>
                                    <input type="number" step="0.01" min="0" value={newStaff.salary} onChange={e => setNewStaff({ ...newStaff, salary: e.target.value })} />
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
                                    <div key={s.id} className="list-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                                        <div className="driver-info-block" style={{ flex: '1 1 auto', minWidth: '150px' }}>
                                            <strong>{s.first_name} {s.last_name}</strong>
                                            <span className="sub-text">{s.email} | {s.phone}</span>
                                            {s.salary > 0 && (
                                                <span className="sub-text" style={{ color: '#2e7d32', fontWeight: 'bold' }}>
                                                    Salary: {formatCurrency(s.salary)}
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <span className={`badge-active ${s.role === 'kitchen' ? 'kitchen-badge' : ''}`}>{s.role}</span>
                                            <button className="btn-small" onClick={() => openEditModal(s)}>✏️ Edit</button>
                                            <button className="btn-small-danger" onClick={() => openDeleteModal(s)}>🗑️ Delete</button>
                                        </div>
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

            {activeTab === 'finances' && (() => {
                const totalIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
                const totalExpense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
                const totalSalary = transactions.filter(t => t.type === 'salary').reduce((sum, t) => sum + t.amount, 0)
                const netProfit = totalIncome - totalExpense - totalSalary

                return (
                    <div className="finances-management">
                        <h3>Financial Statements</h3>
                        
                        <div className="stats-container" style={{ marginBottom: '2rem' }}>
                            <div className="stat-card" style={{ borderTop: '4px solid #4caf50' }}>
                                <h3>Total Income</h3>
                                <p style={{ color: '#2e7d32' }}>{formatCurrency(totalIncome)}</p>
                            </div>
                            <div className="stat-card" style={{ borderTop: '4px solid #f44336' }}>
                                <h3>Total Expenses</h3>
                                <p style={{ color: '#c62828' }}>{formatCurrency(totalExpense)}</p>
                            </div>
                            <div className="stat-card" style={{ borderTop: '4px solid #ff9800' }}>
                                <h3>Total Salaries</h3>
                                <p style={{ color: '#ef6c00' }}>{formatCurrency(totalSalary)}</p>
                            </div>
                            <div className="stat-card" style={{ borderTop: `4px solid ${netProfit >= 0 ? '#4caf50' : '#f44336'}` }}>
                                <h3>Net Profit</h3>
                                <p style={{ color: netProfit >= 0 ? '#2e7d32' : '#c62828' }}>{formatCurrency(netProfit)}</p>
                            </div>
                        </div>

                        <div className="split-view">
                            <div className="card form-card">
                                <h3>Add Transaction</h3>
                                <form onSubmit={handleAddTransaction}>
                                    <div className="form-group">
                                        <label>Transaction Type</label>
                                        <select value={newTransaction.type} onChange={e => setNewTransaction({ ...newTransaction, type: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                                            <option value="expense">Expense</option>
                                            <option value="salary">Salary Payment</option>
                                            <option value="income">Additional Income</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Amount ($)</label>
                                        <input type="number" step="0.01" min="0" required value={newTransaction.amount} onChange={e => setNewTransaction({ ...newTransaction, amount: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <input type="text" required value={newTransaction.description} onChange={e => setNewTransaction({ ...newTransaction, description: e.target.value })} placeholder="e.g. Monthly rent, Waiter salary..." />
                                    </div>
                                    <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem' }}>Record Transaction</button>
                                </form>
                            </div>

                            <div className="card list-card">
                                <h3>Transaction History</h3>
                                <div className="simple-list">
                                    {transactions.length === 0 ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>No transactions recorded yet.</div>
                                    ) : (
                                        transactions.map(t => (
                                            <div key={t.id} className="list-item" style={{ borderLeft: `4px solid ${t.type === 'income' ? '#4caf50' : t.type === 'expense' ? '#f44336' : '#ff9800'}` }}>
                                                <div className="driver-info-block">
                                                    <strong>{t.description}</strong>
                                                    <span className="sub-text" style={{ textTransform: 'capitalize' }}>
                                                        {t.type} • {new Date(t.created_at.replace(' ', 'T') + 'Z').toLocaleString()}
                                                    </span>
                                                </div>
                                                <div style={{ fontWeight: 'bold', color: t.type === 'income' ? '#2e7d32' : '#c62828' }}>
                                                    {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            })()}

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

        {/* Staff Edit / Delete Modal */}
        {staffModal && (
            <div style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999
            }} onClick={closeStaffModal}>
                <div style={{
                    background: '#fff', borderRadius: '12px', padding: '2rem',
                    width: '100%', maxWidth: '480px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    position: 'relative'
                }} onClick={e => e.stopPropagation()}>
                    <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontWeight: 700 }}>
                        {staffModal.mode === 'delete' ? '🗑️ Delete Staff Member' : '✏️ Edit Staff Member'}
                    </h3>

                    {staffModal.mode === 'delete' && (
                        <p style={{ color: '#c62828', marginBottom: '1rem' }}>
                            Are you sure you want to delete <strong>{staffModal.staff.first_name} {staffModal.staff.last_name}</strong>? This cannot be undone.
                        </p>
                    )}

                    <form onSubmit={submitStaffModal}>
                        {staffModal.mode === 'edit' && (
                            <>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>First Name</label>
                                        <input type="text" required value={staffModalForm.firstName} onChange={e => setStaffModalForm({...staffModalForm, firstName: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Last Name</label>
                                        <input type="text" required value={staffModalForm.lastName} onChange={e => setStaffModalForm({...staffModalForm, lastName: e.target.value})} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Email</label>
                                    <input type="email" required value={staffModalForm.email} onChange={e => setStaffModalForm({...staffModalForm, email: e.target.value})} />
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>Phone</label>
                                        <input type="tel" value={staffModalForm.phone} onChange={e => setStaffModalForm({...staffModalForm, phone: e.target.value})} />
                                    </div>
                                    <div className="form-group">
                                        <label>Role</label>
                                        <select value={staffModalForm.role} onChange={e => setStaffModalForm({...staffModalForm, role: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #ddd' }}>
                                            <option value="delivery">Delivery Driver</option>
                                            <option value="kitchen">Kitchen Staff</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Salary ($)</label>
                                    <input type="number" step="0.01" min="0" value={staffModalForm.salary} onChange={e => setStaffModalForm({...staffModalForm, salary: e.target.value})} />
                                </div>
                                <div className="form-group">
                                    <label>New Password <span style={{fontWeight:'normal', color:'#999'}}>(leave blank to keep current)</span></label>
                                    <input type="password" value={staffModalForm.password} onChange={e => setStaffModalForm({...staffModalForm, password: e.target.value})} />
                                </div>
                            </>
                        )}

                        <div className="form-group" style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                            <label style={{ color: '#c62828', fontWeight: 700 }}>🔒 Admin Password (required)</label>
                            <input type="password" required value={staffModalForm.adminPassword} onChange={e => setStaffModalForm({...staffModalForm, adminPassword: e.target.value})} placeholder="Enter your admin password" />
                        </div>

                        {staffModalError && (
                            <p style={{ color: '#c62828', background: '#ffebee', padding: '0.75rem', borderRadius: '6px', margin: '1rem 0 0' }}>
                                ❌ {staffModalError}
                            </p>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button type="button" className="btn" style={{ flex: 1, background: '#eee', color: '#333' }} onClick={closeStaffModal}>Cancel</button>
                            <button type="submit" className={`btn ${staffModal.mode === 'delete' ? 'btn-danger' : 'btn-primary'}`} style={{ flex: 1, background: staffModal.mode === 'delete' ? '#c62828' : undefined, color: '#fff' }} disabled={staffModalLoading}>
                                {staffModalLoading ? 'Processing...' : staffModal.mode === 'delete' ? 'Confirm Delete' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* POS Invoice Modal */}
        {posInvoice && (
            <div className="pos-invoice-overlay" onClick={() => setPosInvoice(null)}>
                <div className="pos-invoice-modal" onClick={e => e.stopPropagation()}>
                    <div className="pos-invoice-title">🍣 Sushi Stun</div>
                    <div className="pos-invoice-sub">
                        {posInvoice.tableName} &nbsp;•&nbsp; {new Date().toLocaleString()}
                    </div>
                    <div className="pos-invoice-sub" style={{ color: '#555' }}>Order #{posInvoice.id}</div>

                    <hr className="pos-invoice-divider" />

                    <table className="pos-invoice-table">
                        <thead>
                            <tr>
                                <th>Item</th>
                                <th>Qty</th>
                                <th>Price</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(posInvoice.cartSnapshot || posInvoice.items || []).map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.name}</td>
                                    <td>{item.quantity}</td>
                                    <td>{formatCurrency(item.price || item.price_at_time)}</td>
                                    <td>{formatCurrency((item.price || item.price_at_time) * item.quantity)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <hr className="pos-invoice-divider" />

                    <div className="pos-invoice-totals">
                        <div className="pos-invoice-total-row"><span>Subtotal</span><span>{formatCurrency(posInvoice.subtotal)}</span></div>
                        <div className="pos-invoice-total-row"><span>Tax (8%)</span><span>{formatCurrency(posInvoice.tax)}</span></div>
                        <div className="pos-invoice-total-row bold"><span>TOTAL</span><span>{formatCurrency(posInvoice.total)}</span></div>
                    </div>

                    <div className="pos-invoice-footer-text">Thank you for dining with us! 🙏</div>

                    <div className="pos-invoice-actions">
                        <button className="pos-btn-close" onClick={() => setPosInvoice(null)}>Close</button>
                        <button className="pos-btn-print" onClick={posPrint}>🖨️ Print Invoice</button>
                        {posInvoice.payment_status === 'pending' && posInvoice.id?.startsWith('pos_') && (
                            <button
                                style={{ flex: 1, padding: '0.85rem', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                                disabled={posPayLoading === posInvoice.id}
                                onClick={() => posPayOrder(posInvoice.id)}
                            >{posPayLoading === posInvoice.id ? '...' : '✅ Mark Paid'}</button>
                        )}
                    </div>
                </div>
            </div>
        )}

        {/* Hidden Print Area — used by @media print CSS */}
        <div id="pos-print-area">
            {posInvoice && (<>
                <div className="print-title">🍣 Sushi Stun</div>
                <div className="print-sub">{posInvoice.tableName} &nbsp;•&nbsp; {new Date().toLocaleString()}</div>
                <div className="print-sub">Order #{posInvoice.id}</div>
                <hr />
                <table>
                    <thead>
                        <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th className="right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(posInvoice.cartSnapshot || posInvoice.items || []).map((item, idx) => (
                            <tr key={idx}>
                                <td>{item.name}</td>
                                <td>{item.quantity}</td>
                                <td className="right">{formatCurrency((item.price || item.price_at_time) * item.quantity)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="total-section">
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatCurrency(posInvoice.subtotal)}</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax (8%)</span><span>{formatCurrency(posInvoice.tax)}</span></div>
                    <div className="grand-total" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}><span>TOTAL</span><span>{formatCurrency(posInvoice.total)}</span></div>
                </div>
                <div className="footer-thanks">Thank you for dining with us!</div>
            </>)}
        </div>
        </>
    )
}

export default Admin
