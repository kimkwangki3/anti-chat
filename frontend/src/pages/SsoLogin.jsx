import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// 외부(델파이) 시스템에서 ?code=... 로 진입 → 일회용 코드를 세션으로 교환해 자동 로그인
const SsoLogin = () => {
    const { ssoLogin } = useAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const code = new URLSearchParams(window.location.search).get('code');
        if (!code) {
            navigate('/login', { replace: true });
            return;
        }
        ssoLogin(code).then((ok) => {
            if (ok) {
                navigate('/', { replace: true });
            } else {
                setError('자동 로그인에 실패했습니다. 잠시 후 로그인 화면으로 이동합니다.');
                setTimeout(() => navigate('/login', { replace: true }), 2500);
            }
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#0f1117] flex items-center justify-center p-6">
            <div className="text-center">
                {error ? (
                    <p className="text-red-400 text-sm">{error}</p>
                ) : (
                    <>
                        <div className="w-10 h-10 border-2 border-[#FF8C69] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">자동 로그인 중...</p>
                    </>
                )}
            </div>
        </div>
    );
};

export default SsoLogin;
