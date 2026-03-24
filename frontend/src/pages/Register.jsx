import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const inputClass = "w-full bg-white/5 border border-white/8 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 focus:bg-white/8 transition-all placeholder:text-gray-600";
const labelClass = "block text-sm font-medium text-gray-300 mb-1.5";

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        name: '',
        nickname: '',
        birthdate: '',
        phone: '',
        gender: 'none',
        recommender: '',
        agreedToPrivacy: false
    });
    const { register, isLoading, error } = useAuthStore();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.agreedToPrivacy) {
            alert('개인정보 처리방침에 동의해 주세요.');
            return;
        }
        const success = await register(formData);
        if (success) navigate('/');
    };

    return (
        <div className="min-h-screen bg-[#0f1117] flex items-center justify-center p-6 relative overflow-hidden py-12">
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8C69]/8 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E8735A]/5 rounded-full blur-[120px]"></div>

            <div className="w-full max-w-xl relative animate-slide-up">
                <div className="bg-[#16181f] border border-white/8 rounded-2xl p-8 shadow-2xl">
                    <div className="flex flex-col items-center mb-7 text-center">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-lg mb-4 border border-[#FF8C69]/20">
                            <span>🍑</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">회원가입</h1>
                        <p className="text-sm text-gray-500 mt-1">피치 챗에 오신 것을 환영합니다</p>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl flex items-center gap-2">
                            <span>⚠️</span> {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>아이디 *</label>
                                <input type="text" name="username" required placeholder="아이디를 입력하세요" className={inputClass} value={formData.username} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>비밀번호 *</label>
                                <input type="password" name="password" required placeholder="비밀번호를 설정하세요" className={inputClass} value={formData.password} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>이름 *</label>
                                <input type="text" name="name" required placeholder="실명을 입력하세요" className={inputClass} value={formData.name} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>닉네임 *</label>
                                <input type="text" name="nickname" required placeholder="사용할 닉네임을 입력하세요" className={inputClass} value={formData.nickname} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>생년월일 *</label>
                                <input type="date" name="birthdate" required className={inputClass + " appearance-none"} value={formData.birthdate} onChange={handleChange} />
                            </div>
                            <div>
                                <label className={labelClass}>연락처 *</label>
                                <input type="tel" name="phone" required placeholder="010-0000-0000" className={inputClass} value={formData.phone} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClass}>성별</label>
                                <div className="flex gap-2">
                                    {['male', 'female'].map(g => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, gender: g }))}
                                            className={`flex-1 py-3 rounded-xl text-sm font-medium transition-all border ${formData.gender === g ? 'bg-[#FF8C69] border-[#FF8C69] text-white' : 'bg-white/5 border-white/8 text-gray-400 hover:bg-white/10'}`}
                                        >
                                            {g === 'male' ? '남성' : '여성'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className={labelClass}>추천인 아이디 (선택)</label>
                                <input type="text" name="recommender" placeholder="추천인 아이디 (선택)" className={inputClass} value={formData.recommender} onChange={handleChange} />
                            </div>
                        </div>

                        <div className="flex items-center gap-3 px-4 py-3 bg-white/5 rounded-xl border border-white/8">
                            <input
                                type="checkbox"
                                name="agreedToPrivacy"
                                id="agreedToPrivacy"
                                checked={formData.agreedToPrivacy}
                                onChange={handleChange}
                                className="w-4 h-4 accent-[#FF8C69] cursor-pointer"
                                required
                            />
                            <label htmlFor="agreedToPrivacy" className="text-sm text-gray-400 cursor-pointer">
                                <Link to="/privacy-policy" className="text-[#FF8C69] hover:underline" target="_blank">개인정보 처리방침</Link>에 동의합니다. (필수)
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full h-12 peach-button flex items-center justify-center mt-1"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : '회원가입'}
                        </button>
                    </form>

                    <div className="mt-5 text-center">
                        <p className="text-sm text-gray-500">
                            이미 계정이 있으신가요?{' '}
                            <Link to="/login" className="text-[#FF8C69] hover:text-[#FFB5A0] transition-colors font-medium">로그인</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
