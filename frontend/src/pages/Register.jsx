import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        nickname: '',
        gender: 'none',
        birthdate: '',
        region: '',
        recommender: ''
    });
    const { register, isLoading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await register(formData);
        if (success) navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#1a1a24] flex items-center justify-center p-6 relative overflow-hidden py-12 md:py-20">
            {/* Decorative Orbs */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8C69]/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E8735A]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-xl relative">
                <div className="bg-[#23232f] border border-white/5 rounded-[2.5rem] p-10 md:p-12 shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
                    <div className="flex flex-col items-center mb-10 text-center">
                        <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-white/10 mb-6 animate-pulse border border-[#FF8C69]/20 pointer-events-none">
                            <span className="drop-shadow-sm">🍑</span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono">
                            JOIN <span className="text-[#FF8C69]">PEACH</span>
                        </h1>
                        <p className="text-[#6b6b8a] text-[10px] font-bold uppercase tracking-[0.4em] mt-2 font-mono italic opacity-60">Start Your Journey</p>
                    </div>

                    {error && (
                        <div className="mb-8 p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] font-bold rounded-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 아이디 */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Identity (ID)</label>
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    placeholder="아이디를 입력하세요"
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                    value={formData.username}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* 비밀번호 */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Security (Pass)</label>
                                <input
                                    type="password"
                                    name="password"
                                    required
                                    placeholder="패스워드를 설정하세요"
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* 닉네임 */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Nickname</label>
                                <input
                                    type="text"
                                    name="nickname"
                                    required
                                    placeholder="사용하실 닉네임을 입력하세요"
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                    value={formData.nickname}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* 생년월일 */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Date of Birth</label>
                                <input
                                    type="date"
                                    name="birthdate"
                                    required
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium appearance-none"
                                    value={formData.birthdate}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* 성별 */}
                            <div className="space-y-4">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Gender</label>
                                <div className="flex gap-3">
                                    {['male', 'female'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                                            className={`flex-1 py-4 rounded-2xl text-[10px] font-black tracking-widest transition-all border uppercase ${formData.gender === g ? 'bg-[#FF8C69] border-[#FF8C69] text-white shadow-lg shadow-[#FF8C69]/20' : 'bg-[#1a1a24] border-white/5 text-[#3e3e56]'}`}
                                        >
                                            {g === 'male' ? '남성' : '여성'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 추천인 */}
                            <div className="space-y-2">
                                <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Recommender (Optional)</label>
                                <input
                                    type="text"
                                    name="recommender"
                                    placeholder="추천인 아이디"
                                    className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                    value={formData.recommender}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>

                        {/* 지역 */}
                        <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-[#6b6b8a] uppercase tracking-widest ml-4 font-mono text-left">Region</label>
                            <input
                                type="text"
                                name="region"
                                required
                                placeholder="사는 지역을 입력하세요 (예: 서울 강남구)"
                                className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a] font-medium"
                                value={formData.region}
                                onChange={handleChange}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-16 orange-gradient hover:scale-[1.02] active:scale-95 text-white font-black py-4 rounded-3xl shadow-2xl shadow-[#FF8C69]/20 transition-all text-sm tracking-[0.3em] uppercase mt-8 flex items-center justify-center font-mono"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>GET STARTED ✨</>
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
