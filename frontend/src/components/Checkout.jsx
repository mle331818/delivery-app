import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Checkout.css'

function Checkout({ cart, clearCart }) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    deliveryAddress: '',
    deliveryPhone: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [locationLoading, setLocationLoading] = useState(false)

  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0) // percentage
  const [promoError, setPromoError] = useState('')
  const [scheduledFor, setScheduledFor] = useState('')

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const discountAmount = subtotal * (promoDiscount / 100)
  const deliveryFee = 5.00
  const tax = (subtotal - discountAmount) * 0.08
  const total = (subtotal - discountAmount) + deliveryFee + tax

  // ... (geolocation code remains same) ...
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }

    setLocationLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords

          // Use OpenStreetMap Nominatim for reverse geocoding (free, no API key needed)
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'SushiDeliveryApp/1.0' // Required by Nominatim
              }
            }
          )

          const data = await response.json()

          if (data && data.address) {
            setFormData(prev => ({
              ...prev,
              deliveryAddress: data.display_name || `${latitude}, ${longitude}`
            }))
          } else {
            setFormData(prev => ({
              ...prev,
              deliveryAddress: `${latitude}, ${longitude}`
            }))
          }
        } catch (err) {
          console.error('Reverse geocoding error:', err)
          const { latitude, longitude } = position.coords
          setFormData(prev => ({
            ...prev,
            deliveryAddress: `${latitude}, ${longitude}`
          }))
        } finally {
          setLocationLoading(false)
        }
      },
      (error) => {
        setLocationLoading(false)
        setError('Could not get your location. Please check browser permissions.')
      },
      {
        enableHighAccuracy: true,
        timeout: 10000
      }
    )
  }

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    try {
      const res = await axios.post('/api/promos/validate', { code: promoCode });
      setPromoDiscount(res.data.discount_percent);
      setPromoError('');
    } catch (err) {
      setPromoDiscount(0);
      setPromoError('Invalid or expired code');
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const orderData = {
        items: cart.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity
        })),
        deliveryAddress: formData.deliveryAddress,
        deliveryPhone: formData.deliveryPhone,
        promoCode: promoCode || null,
        scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : null
      }

      const response = await axios.post('/api/orders', orderData)

      setSuccess(true)
      clearCart()

      setTimeout(() => {
        navigate('/orders')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="checkout-page">
        <div className="success-message">
          <h2>✅ Order Placed Successfully!</h2>
          <p>Your order is being prepared. You'll be redirected to your orders...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="checkout-page">
      <h2>Checkout</h2>

      <div className="checkout-content">
        <form onSubmit={handleSubmit} className="checkout-form">
          <div className="form-group">
            <label>Delivery Address *</label>
            <div className="address-input-wrapper">
              <textarea
                value={formData.deliveryAddress}
                onChange={(e) => setFormData({ ...formData, deliveryAddress: e.target.value })}
                required
                rows="3"
                placeholder="Enter your full delivery address"
                className={locationLoading ? 'loading' : ''}
              />
              <button
                type="button"
                onClick={getCurrentLocation}
                disabled={locationLoading}
                className="btn-location"
                title="Use your current location"
              >
                {locationLoading ? (
                  <>
                    <span className="spinner"></span> Getting location...
                  </>
                ) : (
                  <>
                    📍 Use Current Location
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label>Phone Number *</label>
            <input
              type="tel"
              value={formData.deliveryPhone}
              onChange={(e) => setFormData({ ...formData, deliveryPhone: e.target.value })}
              required
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="form-group">
            <label>Promo Code (Optional)</label>
            <div className="promo-input-group" style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="Ex. SAVE20"
              />
              <button type="button" onClick={handleApplyPromo} className="btn-secondary" style={{ width: 'auto' }}>Apply</button>
            </div>
            {promoError && <div className="error">{promoError}</div>}
            {promoDiscount > 0 && <div className="success">Promo Applied: {promoDiscount}% Off!</div>}
          </div>

          <div className="form-group">
            <label>Schedule for Later (Optional)</label>
            <input
              type="datetime-local"
              value={scheduledFor}
              onChange={(e) => setScheduledFor(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          {error && <div className="error">{error}</div>}

          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || cart.length === 0}
          >
            {loading ? 'Placing Order...' : 'Place Order'}
          </button>
        </form>

        <div className="order-summary">
          <h3>Order Summary</h3>
          <div className="summary-items">
            {cart.map(item => (
              <div key={item.menuItemId} className="summary-item">
                <span>{item.name} x {item.quantity}</span>
                <span>${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="summary-totals">
            <div className="summary-row">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            {promoDiscount > 0 && (
              <div className="summary-row" style={{ color: 'green' }}>
                <span>Discount ({promoDiscount}%)</span>
                <span>-${discountAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row">
              <span>Delivery Fee</span>
              <span>${deliveryFee.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="summary-row total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Checkout

