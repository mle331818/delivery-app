const testRoles = async () => {
    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('🧪 Starting Role Verification Test...\n');

        // Helper for requests
        const post = async (url, body) => {
            const res = await fetch(API_URL + url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) throw new Error(`POST ${url} failed: ${res.status} ${res.statusText}`);
            return res.json();
        };

        const get = async (url, token) => {
            const res = await fetch(API_URL + url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) throw new Error(`GET ${url} failed: ${res.status} ${res.statusText}`);
            return res.json();
        };

        // 1. Test Admin Login
        console.log('1️⃣  Testing Admin Login...');
        const adminLogin = await post('/auth/login', {
            email: 'admin@sushi.com',
            password: 'admin123'
        });
        const adminToken = adminLogin.token;
        console.log('✅ Admin logged in successfully');

        // 2. Test Admin Data Access
        console.log('2️⃣  Testing Admin Dashboard Access...');
        const adminOrders = await get('/admin/orders', adminToken);
        console.log(`✅ Admin can access orders (Count: ${adminOrders.length})`);

        const drivers = await get('/admin/drivers', adminToken);
        console.log(`✅ Admin can access drivers (Count: ${drivers.length})`);

        // 3. Test Delivery Login
        console.log('\n3️⃣  Testing Delivery Login...');
        const deliveryLogin = await post('/auth/login', {
            email: 'driver@sushi.com',
            password: 'delivery123'
        });
        const deliveryToken = deliveryLogin.token;
        console.log('✅ Driver logged in successfully');

        // 4. Test Delivery Data Access
        console.log('4️⃣  Testing Delivery Dashboard Access...');
        const deliveryOrders = await get('/delivery/orders', deliveryToken);
        console.log(`✅ Driver can access assigned orders (Count: ${deliveryOrders.length})`);

        console.log('\n✨ All Role Tests Passed! The system is ready.');

    } catch (error) {
        console.error('\n❌ Test Failed:', error.message);
        if (error.cause) console.error(error.cause);
    }
};

testRoles();
