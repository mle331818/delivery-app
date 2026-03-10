# Login Credentials

## Admin Account (New!)
- **Email:** `admin@sushi.com`
- **Password:** `admin123`
- **Role:** Admin
- **Access:** Admin Dashboard (Manage orders, Assign drivers, View stats)

## Delivery Driver Account (New!)
- **Email:** `driver@sushi.com`
- **Password:** `delivery123`
- **Role:** Delivery
- **Access:** Delivery Dashboard (My tasks, Pickup/Complete orders, Navigation)

## Kitchen Staff Account
- **Email:** `kitchen@sushi.com`
- **Password:** `kitchen123`
- **Role:** Kitchen
- **Access:** Kitchen Dashboard (Order preparation workflow)

## Test Customer Account
- **Email:** `customer@test.com`
- **Password:** `password123`
- **Role:** Customer
- **Access:** Menu, Cart, Orders

## Workflow Guide
1. **Customer** places an order -> Status: `pending`
2. **Kitchen** sees order, starts preparing -> Status: `preparing`
3. **Kitchen** marks order ready -> Status: `ready`
4. **Admin** assigns order to **Driver** (can be done anytime)
5. **Driver** seeks task in "Delivery" dashboard
6. **Driver** picks up order -> Status: `picked_up`
7. **Driver** completes delivery -> Status: `delivered`
