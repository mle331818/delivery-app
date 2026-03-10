# 🍣 Sushi Stun Delivery - Demo

A working demo of the sushi restaurant delivery system with customer ordering, kitchen management, and order tracking.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
npm install
```

2. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### Running the Application

1. **Start the Backend Server** (Terminal 1)
```bash
cd backend
npm start
```
The backend will run on `http://localhost:5000`

2. **Start the Frontend** (Terminal 2)
```bash
cd frontend
npm run dev
```
The frontend will run on `http://localhost:3000`

### Test Accounts

**Customer Account:**
- Email: `customer@test.com`
- Password: `password123`

**Kitchen Staff Account:**
- Email: `kitchen@sushi.com`
- Password: `kitchen123`
- Access: Kitchen Dashboard for order management

Or create a new account by clicking "Register".

## 📱 Features Demonstrated

### Customer Features
- ✅ Browse menu by category
- ✅ Add items to cart
- ✅ View and modify cart
- ✅ Checkout with delivery address
- ✅ View order history
- ✅ Order status tracking

### Kitchen Features
- ✅ View pending orders
- ✅ Mark orders as "preparing"
- ✅ Mark orders as "ready"
- ✅ Auto-refresh every 5 seconds

## 🗂️ Project Structure

```
.
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json
│   └── delivery.db        # SQLite database (auto-created)
│
├── frontend/
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── App.jsx        # Main app component
│   │   └── main.jsx       # Entry point
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

## 🎯 How to Test

1. **Browse Menu**
   - Go to `http://localhost:3000`
   - Browse different categories (Nigiri, Sashimi, Rolls, Appetizers)
   - Add items to cart

2. **Place an Order**
   - Click "Cart" in header
   - Review items and quantities
   - Click "Proceed to Checkout"
   - Login or register if needed
   - Enter delivery address and phone
   - Click "Place Order"

3. **View Orders**
   - Click "My Orders" in header
   - See all your past orders with status

4. **Kitchen View**
   - Click "Kitchen" in header (no login required for demo)
   - See pending orders
   - Click "Start Preparing" on an order
   - Click "Mark Ready" when done

## 🔧 Tech Stack

- **Frontend:** React, React Router, Axios, Vite
- **Backend:** Node.js, Express, SQLite (better-sqlite3)
- **Authentication:** JWT (JSON Web Tokens)
- **Database:** SQLite (for demo - easily switchable to PostgreSQL)

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Menu
- `GET /api/menu/categories` - Get all categories
- `GET /api/menu/items` - Get all items (optional: `?category_id=xxx`)
- `GET /api/menu/items/:id` - Get single item

### Orders
- `POST /api/orders` - Create new order (requires auth)
- `GET /api/orders/my-orders` - Get user's orders (requires auth)
- `GET /api/orders/:id` - Get single order (requires auth)

### Kitchen
- `GET /api/kitchen/orders?status=pending` - Get orders by status
- `PATCH /api/kitchen/orders/:id/status` - Update order status

## 🎨 Design Features

- **Mobile-first responsive design**
- **Clean, minimal UI**
- **Fast and intuitive navigation**
- **Real-time order updates** (kitchen refreshes every 5 seconds)

## 🔐 Security Notes (Demo)

This is a demo application. For production:
- Use environment variables for JWT secret
- Implement proper password requirements
- Add rate limiting
- Use HTTPS
- Switch to PostgreSQL for production
- Add input validation middleware
- Implement proper error handling

## 🚧 Next Steps

To make this production-ready:
1. Add payment processing (Stripe integration)
2. Add real-time WebSocket updates
3. Add delivery driver interface
4. Add admin dashboard
5. Switch to PostgreSQL
6. Add email/SMS notifications
7. Add image upload for menu items
8. Add order cancellation
9. Add reviews/ratings

## 📄 License

This is a demo project for educational purposes.



