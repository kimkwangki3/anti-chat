import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from '../api/axios';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const { login, isLoading, error } = useAuthStore();
    const navigate = useNavigate();
    const { slug } = useParams();

    // 채널 로그인 모드: 경로(/c/:slug) 또는 현재 도메인(host)으로 채널 감지
    const [channelInfo, setChannelInfo] = useState(null);
    const [resolving, setResolving] = useState(true);

    useEffect(() => {
        let alive = true;
        const resolveChannel = async () => {
            try {
                const params = slug ? { slug } : { host: window.location.hostname };
                const { data } = await axios.get('/channels/login-info', { params });
                if (alive) setChannelInfo(data);
            } catch {
                if (alive) setChannelInfo(null); // 메인 로그인 모드
            } finally {
                if (alive) setResolving(false);
            }
        };
        resolveChannel();
        return () => { alive = false; };
    }, [slug]);

    const isChannelMode = Boolean(channelInfo);
    const accent = channelInfo?.cardColor || '#FF8C69';
    const title = isChannelMode ? (channelInfo.loginTitle || channelInfo.name) : '피치 챗';
    const subtitle = isChannelMode ? `${channelInfo.name} 채널` : '팀과 함께하는 소통 공간';

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(formData.username, formData.password, channelInfo?.id || null);
        if (success) navigate('/');
    };

    if (resolving) {
        return (
            <div className="min-h-screen min-h-[100dvh] bg-[#0f1117] flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-[#FF8C69] border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#0f1117] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px]" style={{ backgroundColor: `${accent}14` }}></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full blur-[120px]" style={{ backgroundColor: `${accent}0d` }}></div>

            <div className="w-full max-w-sm relative z-10 animate-slide-up">
                <div className="bg-[#16181f] border border-white/8 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-4 overflow-hidden" style={{ border: `1px solid ${accent}33` }}>
                            {isChannelMode && channelInfo.loginLogo ? (
                                <img src={channelInfo.loginLogo} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span>🍑</span>
                            )}
                        </div>
                        <h1 className="text-2xl font-bold text-white text-center">{title}</h1>
                        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-300">아이디</label>
                            <input
                                type="text"
                                required
                                placeholder="아이디를 입력하세요"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:bg-white/8 transition-all placeholder:text-gray-600"
                                style={{ caretColor: accent }}
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-sm font-medium text-gray-300">비밀번호</label>
                            <input
                                type="password"
                                required
                                placeholder="비밀번호를 입력하세요"
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:bg-white/8 transition-all placeholder:text-gray-600"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 flex items-center justify-center gap-2 mt-2 rounded-xl font-bold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
                            style={{ backgroundColor: accent, boxShadow: `0 10px 20px ${accent}33` }}
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : '로그인'}
                        </button>
                    </form>

                    {!isChannelMode && (
                        <p className="mt-6 text-center text-[11px] text-gray-600 leading-relaxed">
                            일반 회원은 가입한 채널의 전용 로그인 주소로 접속해 주세요.<br />여기는 관리자 전용 로그인입니다.
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;
