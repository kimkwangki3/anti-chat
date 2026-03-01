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
        <div className="min-h-screen min-h-[100dvh] bg-[#09090b] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Orbs */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#FF8C69]/10 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#E8735A]/5 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-md relative z-10 animate-slide-up">
                <div className="glass-card p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.5)] !bg-white/[0.02] border-white/5">
                    <div className="flex flex-col items-center mb-12">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-white/10 mb-6 border border-[#FF8C69]/20 pointer-events-none">
                            <span className="drop-shadow-sm">🍑</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono">
                            PEACH<span className="text-[#FF8C69]">.</span>
                        </h1>
                        <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.4em] mt-2 font-mono italic opacity-60">Enterprise Connection</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 font-mono text-left">Identify</label>
                            <input
                                type="text"
                                required
                                placeholder="아이디를 입력하세요"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/40 focus:bg-white/[0.07] transition-all placeholder:text-slate-600 font-medium"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-4 font-mono text-left">Security</label>
                            <input
                                type="password"
                                required
                                placeholder="패스워드를 입력하세요"
                                className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/40 focus:bg-white/[0.07] transition-all placeholder:text-slate-600 font-medium"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 peach-button flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>START CONNECTING 🚀</>
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                            New to Peach? <Link to="/register" className="text-[#FF8C69] hover:text-[#FFB5A0] transition-colors decoration-[#FF8C69]/20 decoration-2 underline-offset-8 underline">Create Account</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
