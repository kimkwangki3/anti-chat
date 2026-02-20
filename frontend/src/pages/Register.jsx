import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', username: '', password: '', role: 'member' });
    const [channelName, setChannelName] = useState('');
    const { register, isLoading, error } = useAuthStore();
    const navigate = useNavigate();

    // 관리자 선택 시 대화명 자동 조합
    const handleChannelNameChange = (value) => {
        setChannelName(value);
        setFormData(prev => ({ ...prev, name: value }));
    };

    const handleRoleChange = (role) => {
        setChannelName('');
        setFormData(prev => ({ ...prev, role, name: role === 'member' ? prev.name : '' }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await register(formData.name, formData.username, formData.password, formData.role);
        if (success) navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#1a1a24] flex items-center justify-center p-6 relative overflow-hidden">
            {/* Decorative Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8C69]/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E8735A]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-md relative">
                <div className="bg-[#23232f] border border-white/5 rounded-[2.5rem] p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
                    <div className="flex flex-col items-center mb-10">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-white/10 mb-6 animate-pulse border border-[#FF8C69]/20 pointer-events-none">
                            <span className="drop-shadow-sm">🍑</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono">
                            JOIN <span className="text-[#FF8C69]">PEACH</span>
                        </h1>
                        <p className="text-[#6b6b8a] text-[10px] font-bold uppercase tracking-[0.4em] mt-2 font-mono italic opacity-60">Create Your Space</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 이름 / 채널명 입력 */}
                        {formData.role === 'member' ? (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono">Full Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="이름을 입력하세요"
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono">Channel Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="운영할 채널 이름을 입력하세요"
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                    value={channelName}
                                    onChange={(e) => handleChannelNameChange(e.target.value)}
                                />
                                {channelName && (
                                    <p className="text-[11px] text-[#FF8C69] ml-4 font-mono">
                                        대화명: <span className="font-bold">{channelName} 관리자</span>
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono">Identify</label>
                            <input
                                type="text"
                                required
                                placeholder="아이디를 입력하세요"
                                className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono">Security</label>
                            <input
                                type="password"
                                required
                                placeholder="패스워드를 설정하세요"
                                className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            />
                        </div>

                        <div className="space-y-3">
                            <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-center">Select Role</label>
                            <div className="flex gap-4">
                                <button
                                    type="button"
                                    onClick={() => handleRoleChange('member')}
                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all border uppercase ${formData.role === 'member' ? 'bg-[#FF8C69] border-[#FF8C69] text-white shadow-lg shadow-[#FF8C69]/20' : 'bg-[#1a1a24] border-white/5 text-[#3e3e56]'}`}
                                >
                                    Member
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleRoleChange('admin')}
                                    className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all border uppercase ${formData.role === 'admin' ? 'bg-[#FF8C69] border-[#FF8C69] text-white shadow-lg shadow-[#FF8C69]/20' : 'bg-[#1a1a24] border-white/5 text-[#3e3e56]'}`}
                                >
                                    Admin
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 orange-gradient hover:scale-[1.02] active:scale-95 text-white font-black py-4 rounded-3xl shadow-2xl shadow-[#FF8C69]/20 transition-all text-xs tracking-[0.3em] uppercase mt-4 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>CREATE ACCOUNT ✨</>
                            )}
                        </button>
                    </form>

                    <div className="mt-10 text-center">
                        <p className="text-[11px] text-[#6b6b8a] font-bold uppercase tracking-widest">
                            Already Have an Account? <Link to="/login" className="text-[#FF8C69] hover:text-[#FFB5A0] transition-colors decoration-[#FF8C69]/20 decoration-2 underline-offset-8 underline">Login Now</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
