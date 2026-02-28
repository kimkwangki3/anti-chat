const axios = require('axios');

const testRegistration = async () => {
    try {
        const response = await axios.post('http://127.0.0.1:5000/api/auth/register', {
            name: 'Axios Test User',
            email: 'axios_test_' + Date.now() + '@example.com',
            password: 'password123',
            role: 'member'
        });

        console.log('회원가입 성공!');
        console.log('응답 데이터:', response.data);
    } catch (error) {
        console.error('회원가입 실패:', error.message);
        if (error.response) {
            console.error('응답 상태 코드:', error.response.status);
            console.error('응답 데이터:', error.response.data);
        }
    }
};

testRegistration();
