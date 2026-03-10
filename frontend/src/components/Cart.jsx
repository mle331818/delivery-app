import { Link } from 'react-router-dom'
import './Cart.css'

function Cart({ cart, updateCartItem }) {
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const deliveryFee = 5.00
  const tax = subtotal * 0.08
  const total = subtotal + deliveryFee + tax

  if (cart.length === 0) {
    return (
      <div className="cart-page">
        <h2>Your Cart</h2>
        <div className="empty-cart">
          <p>Your cart is empty</p>
          <Link to="/" className="btn btn-primary">Browse Menu</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="cart-page">
      <h2>Your Cart</h2>
      
      <div className="cart-items">
        {cart.map(item => (
          <div key={item.menuItemId} className="cart-item">
            <div className="cart-item-info">
              <h3>{item.name}</h3>
              <p>${item.price.toFixed(2)} each</p>
            </div>
            <div className="cart-item-controls">
              <button 
                className="quantity-btn"
                onClick={() => updateCartItem(item.menuItemId, item.quantity - 1)}
              >
                −
              </button>
              <span className="quantity">{item.quantity}</span>
              <button 
                className="quantity-btn"
                onClick={() => updateCartItem(item.menuItemId, item.quantity + 1)}
              >
                +
              </button>
              <span className="item-total">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="cart-summary">
        <div className="summary-row">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
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
        <Link to="/checkout" className="btn btn-primary checkout-btn">
          Proceed to Checkout
        </Link>
      </div>
    </div>
  )
}

export default Cart



