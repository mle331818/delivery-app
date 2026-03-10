const testAdminEndpoints = async () => {
    const API_URL = 'http://localhost:5000/api';

    try {
        console.log('🧪 Testing Admin Endpoints...\n');

        // 1. Login as Admin
        const loginRes = await fetch(API_URL + '/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@sushi.com', password: 'admin123' })
        });

        if (!loginRes.ok) throw new Error('Admin login failed');
        const { token } = await loginRes.json();
        console.log('✅ Admin login successful');

        // 2. Test Create Driver Endpoint Availability
        // We send a bad request just to see if it reaches the route (400 vs 404)
        const driverRes = await fetch(API_URL + '/admin/drivers', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({}) // Empty body should trigger 500 or 400, strictly NOT 404
        });

        if (driverRes.status === 404) {
            console.error('❌ /api/admin/drivers endpoint NOT FOUND. Server likely needs restart.');
        } else {
            console.log(`✅ /api/admin/drivers endpoint reachable (Status: ${driverRes.status})`);
        }

        // 3. Test Menu Endpoint Availability
        const menuRes = await fetch(API_URL + '/admin/menu', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        if (menuRes.status === 404) {
            console.error('❌ /api/admin/menu endpoint NOT FOUND. Server likely needs restart.');
        } else {
            console.log(`✅ /api/admin/menu endpoint reachable (Status: ${menuRes.status})`);
        }

    } catch (error) {
        console.error('Test Error:', error.message);
    }
};

testAdminEndpoints();
