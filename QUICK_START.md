# 🚀 Quick Start Guide

## Step 1: Install Dependencies

Open **two terminal windows**:

### Terminal 1 - Backend
```bash
cd backend
npm install
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install
```

## Step 2: Start the Application

### Terminal 1 - Start Backend
```bash
cd backend
npm start
```

You should see:
```
🚀 Server running on http://localhost:5000
📱 API ready at http://localhost:5000/api
```

### Terminal 2 - Start Frontend
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
```

## Step 3: Open in Browser

Open **http://localhost:3000** in your browser.

## Step 4: Test the System

### Option A: Use Test Account
- Click **"Login"**
- Email: `customer@test.com`
- Password: `password123`

### Option B: Create New Account
- Click **"Register"**
- Fill in your details
- Create account

### Then:
1. **Browse Menu** - Add items to cart
2. **View Cart** - Modify quantities
3. **Checkout** - Enter delivery address
4. **View Orders** - See your order history
5. **Kitchen View** - Click "Kitchen" to see orders and mark them as ready

## 🎯 What to Test

✅ Browse menu categories  
✅ Add items to cart  
✅ Modify cart quantities  
✅ Place an order  
✅ View order history  
✅ Kitchen dashboard (view and update orders)  

## 🐛 Troubleshooting

**Backend won't start?**
- Make sure port 5000 is not in use
- Check Node.js version (need v18+)

**Frontend won't start?**
- Make sure port 3000 is not in use
- Make sure backend is running first

**Can't login?**
- Use the test account: `customer@test.com` / `password123`
- Or create a new account

**Database errors?**
- Delete `backend/delivery.db` and restart backend (it will recreate)

## 📱 Features to Try

1. **Menu Filtering** - Click category tabs to filter items
2. **Cart Management** - Add/remove items, change quantities
3. **Order Placement** - Complete checkout flow
4. **Order Tracking** - View order status in "My Orders"
5. **Kitchen Updates** - Open kitchen view, update order status

Enjoy testing! 🍣



