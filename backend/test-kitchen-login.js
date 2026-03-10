import axios from 'axios';

const testKitchenLogin = async () => {
    try {
        console.log('Testing kitchen login...\n');

        // Test login
        const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
            email: 'kitchen@sushi.com',
            password: 'kitchen123'
        });

        console.log('✅ Login successful!');
        console.log('User:', loginResponse.data.user);
        console.log('Role:', loginResponse.data.user.role);
        console.log('Token received:', loginResponse.data.token ? 'Yes' : 'No');

        // Test kitchen access
        console.log('\nTesting kitchen API access...');
        const kitchenResponse = await axios.get('http://localhost:5000/api/kitchen/orders?status=pending', {
            headers: {
                'Authorization': `Bearer ${loginResponse.data.token}`
            }
        });

        console.log('✅ Kitchen API access successful!');
        console.log('Orders found:', kitchenResponse.data.length);

    } catch (error) {
        console.error('❌ Error:', error.response?.data || error.message);
    }
};

testKitchenLogin();
