import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Login = () => {
    const [formData, setFormData] = useState({ username: '', password: '' });
    const { login, isLoading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await login(formData.username, formData.password);
        if (success) navigate('/');
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[#0f1117] flex items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF8C69]/8 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E8735A]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-sm relative z-10 animate-slide-up">
                <div className="bg-[#16181f] border border-white/8 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-8">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-4 border border-[#FF8C69]/20">
                            <span>🍑</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">피치 챗</h1>
                        <p className="text-sm text-gray-500 mt-1">팀과 함께하는 소통 공간</p>
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
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 focus:bg-white/8 transition-all placeholder:text-gray-600"
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
                                className="w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 focus:bg-white/8 transition-all placeholder:text-gray-600"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 peach-button flex items-center justify-center gap-2 mt-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : '로그인'}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500">
                            계정이 없으신가요?{' '}
                            <Link to="/register" className="text-[#FF8C69] hover:text-[#FFB5A0] transition-colors font-medium">
                                회원가입
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
