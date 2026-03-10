# 🧪 Testing Guide - Sushi Stun Delivery

This guide explains how to test the frontend and backend of Sushi Stun Delivery.

## 📋 Table of Contents
- [Quick Start (Automated)](#quick-start-automated)
- [Manual Start](#manual-start)
- [Testing Checklist](#testing-checklist)
- [API Testing](#api-testing)
- [Troubleshooting](#troubleshooting)

---

## 🚀 Quick Start (Automated)

### Option 1: PowerShell Script (Recommended)
Double-click `start-dev.ps1` or run in PowerShell:
```powershell
.\start-dev.ps1
```

### Option 2: Batch Script
Double-click `start-dev.bat` or run in Command Prompt:
```cmd
start-dev.bat
```

Both scripts will:
- ✅ Check if Node.js is installed
- ✅ Install dependencies if needed
- ✅ Start backend server (port 5000)
- ✅ Start frontend server (port 3000)
- ✅ Open in separate terminal windows

### Stopping Servers
To stop all servers, run:
```powershell
.\stop-dev.ps1
```

Or simply close the terminal windows.

---

## 🔧 Manual Start

If you prefer to start servers manually:

### Terminal 1 - Backend
```bash
cd backend
npm install          # First time only
npm start           # Start backend server
```

Expected output:
```
🚀 Server running on http://localhost:5000
📱 API ready at http://localhost:5000/api
```

### Terminal 2 - Frontend
```bash
cd frontend
npm install          # First time only
npm run dev         # Start frontend dev server
```

Expected output:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:3000/
```

---

## ✅ Testing Checklist

### 1. Authentication Testing
- [ ] **Register New User**
  - Navigate to registration page
  - Fill in: name, email, password
  - Verify account creation
  
### Option A: Use Test Account (Customer)
- Click **"Login"**
- Email: `customer@test.com`
- Password: `password123`

### Option B: Use Kitchen Staff Account
- Click **"Login"**
- Email: `kitchen@sushi.com`
- Password: `kitchen123`
- Access to Kitchen Dashboard for order management
  - Verify successful login and token storage

- [ ] **Logout**
  - Click logout button
  - Verify redirect to login page
  - Verify token cleared

### 2. Menu & Cart Testing
- [ ] **Browse Menu**
  - View all menu items
  - Check images load correctly
  - Verify prices display properly
  
- [ ] **Filter by Category**
  - Click different category tabs
  - Verify filtering works correctly
  
- [ ] **Add to Cart**
  - Add multiple items
  - Verify cart counter updates
  - Check cart icon badge
  
- [ ] **Modify Cart**
  - Increase/decrease quantities
  - Remove items
  - Verify total price updates

### 3. Order Placement Testing
- [ ] **Checkout Flow**
  - Navigate to cart
  - Click "Proceed to Checkout"
  - Enter delivery address
  - Add special instructions (optional)
  - Place order
  
- [ ] **Order Confirmation**
  - Verify order success message
  - Check order appears in "My Orders"
  - Verify order details are correct

### 4. Order Management Testing (Customer)
- [ ] **View Order History**
  - Navigate to "My Orders"
  - Verify all orders display
  - Check order status
  - View order details

### 5. Kitchen Dashboard Testing (Kitchen Staff Only)
- [ ] **Login as Kitchen Staff**
  - Logout if currently logged in
  - Email: `kitchen@sushi.com`
  - Password: `kitchen123`
  - Verify "Kitchen" link appears in navigation
  
- [ ] **Access Kitchen Dashboard**
  - Click "Kitchen" link in navigation
  - Or navigate directly to `/kitchen`
  - Verify dashboard loads successfully
  
- [ ] **View Order Statistics**
  - Check real-time order counts (New, Preparing, Ready)
  - Verify color-coded status badges
  
- [ ] **Manage Orders**
  - View pending orders
  - Click "Start Preparing" on a pending order
  - Verify order moves to "Preparing" tab
  - Click "Mark Ready" on a preparing order
  - Verify order moves to "Ready" tab
  - Check order details display correctly

### 6. Role-Based Access Control Testing
- [ ] **Test Customer Access Restrictions**
  - Login as customer (`customer@test.com`)
  - Verify "Kitchen" link is NOT visible in navigation
  - Try accessing `/kitchen` directly in URL
  - Verify redirect to home page (access denied)
  
- [ ] **Test Kitchen Staff Access**
  - Login as kitchen staff (`kitchen@sushi.com`)
  - Verify "Kitchen" link IS visible in navigation
  - Access kitchen dashboard successfully
  - Verify can view and manage all orders

### 7. UI/UX Testing
- [ ] **Responsive Design**
  - Test on different screen sizes
  - Verify mobile layout
  - Check tablet view
  
- [ ] **Navigation**
  - Test all navigation links
  - Verify back button works
  - Check breadcrumbs (if applicable)
  
- [ ] **Error Handling**
  - Test with invalid inputs
  - Verify error messages display
  - Check network error handling

---

## 🔌 API Testing

### Using cURL

#### 1. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```

#### 2. Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "customer@test.com",
    "password": "password123"
  }'
```

#### 3. Get Menu Items
```bash
curl http://localhost:5000/api/menu
```

#### 4. Get User Orders (requires token)
```bash
curl http://localhost:5000/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

#### 5. Place Order (requires token)
```bash
curl -X POST http://localhost:5000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "items": [
      {"menuItemId": 1, "quantity": 2},
      {"menuItemId": 3, "quantity": 1}
    ],
    "deliveryAddress": "123 Test Street",
    "specialInstructions": "Ring doorbell"
  }'
```

### Using Postman or Thunder Client

1. Import the following endpoints:
   - `POST /api/auth/register`
   - `POST /api/auth/login`
   - `GET /api/menu`
   - `GET /api/orders`
   - `POST /api/orders`
   - `PATCH /api/orders/:id/status`

2. Set up environment variables:
   - `BASE_URL`: `http://localhost:5000`
   - `TOKEN`: (save from login response)

---

## 🐛 Troubleshooting

### Backend Won't Start

**Error: Port 5000 already in use**
```powershell
# Find and kill process on port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force
```

**Error: Cannot find module**
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
```

**Database errors**
```bash
# Delete and recreate database
cd backend
rm delivery.db
npm start  # Will recreate database with seed data
```

### Frontend Won't Start

**Error: Port 3000 already in use**
```powershell
# Find and kill process on port 3000
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess | Stop-Process -Force
```

**Error: Cannot connect to backend**
- Ensure backend is running on port 5000
- Check `frontend/src/config.js` or API base URL
- Verify CORS is enabled in backend

**Blank page or errors in console**
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Common Issues

**Login not working**
- Check browser console for errors
- Verify backend is running
- Try test account: `customer@test.com` / `password123`
- Clear browser localStorage and try again

**Cart not updating**
- Check browser console
- Verify API calls are successful
- Clear browser cache and reload

**Orders not appearing**
- Ensure you're logged in
- Check network tab for API responses
- Verify token is being sent in headers

---

## 📊 Performance Testing

### Load Testing (Optional)

Install Apache Bench or similar tool:
```bash
# Test login endpoint
ab -n 100 -c 10 -p login.json -T application/json http://localhost:5000/api/auth/login

# Test menu endpoint
ab -n 1000 -c 50 http://localhost:5000/api/menu
```

### Browser Performance

1. Open Chrome DevTools
2. Go to "Performance" tab
3. Record page interactions
4. Analyze:
   - Page load time
   - API response times
   - Render performance

---

## 📝 Test Data

### Pre-seeded Accounts
- **Customer**: `customer@test.com` / `password123`
- **Kitchen Staff**: `kitchen@sushi.com` / `kitchen123`

### Sample Menu Items
The database is pre-seeded with sushi menu items including:
- Nigiri (Salmon, Tuna, Eel)
- Rolls (California, Spicy Tuna, Dragon)
- Sashimi
- Appetizers

---

## 🎯 Success Criteria

Your system is working correctly if:
- ✅ Both servers start without errors
- ✅ Frontend loads at http://localhost:3000
- ✅ Backend API responds at http://localhost:5000
- ✅ User can register and login
- ✅ Menu items display correctly
- ✅ Cart functionality works
- ✅ Orders can be placed and viewed
- ✅ Kitchen dashboard updates order status

---

## 📚 Additional Resources

- [Quick Start Guide](QUICK_START.md)
- [OAuth Setup Guide](OAUTH_SETUP.md)
- [Project Plan](DELIVERY_SYSTEM_PLAN.md)
- [README](README.md)

---

**Happy Testing! 🍣**
