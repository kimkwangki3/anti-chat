import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

// 외부 프로그램이 ?id=...&pwd=...&key=...&channel=... 로 진입 → 직접 자동 로그인
const AutoLogin = () => {
    const { directLogin } = useAuthStore();
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const p = new URLSearchParams(window.location.search);
        const username = p.get('id');
        const password = p.get('pwd');
        const key = p.get('key');
        const channelSlug = p.get('channel');

        if (!username || !password || !key || !channelSlug) {
            setError('필수 정보(id, pwd, key, channel)가 누락되었습니다.');
            setTimeout(() => navigate('/login', { replace: true }), 2500);
            return;
        }
        directLogin({ username, password, channelSlug, key }).then((ok) => {
            if (ok) {
                navigate('/', { replace: true });
            } else {
                setError('자동 로그인에 실패했습니다. 잠시 후 로그인 화면으로 이동합니다.');
                setTimeout(() => navigate(`/c/${channelSlug}`, { replace: true }), 2500);
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

export default AutoLogin;
