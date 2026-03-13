import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const initialForm = {
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    nickname: '',
    phone: '',
    birthdate: '',
    gender: 'none'
};

const usernameRule = /^(?=.{4,20}$)[a-z0-9._-]+$/;
const passwordRule = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,20}$/;

const passwordChecks = (password) => [
    { label: '8자 이상 20자 이하', passed: password.length >= 8 && password.length <= 20 },
    { label: '영문 포함', passed: /[A-Za-z]/.test(password) },
    { label: '숫자 포함', passed: /\d/.test(password) },
    { label: '특수문자 포함', passed: /[^A-Za-z\d]/.test(password) }
];

const SuperAdminAdmins = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [form, setForm] = useState(initialForm);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usernameCheck, setUsernameCheck] = useState({ state: 'idle', message: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    const admins = useMemo(
        () => users.filter((user) => user.role === 'admin' || user.role === 'superadmin'),
        [users]
    );

    const passwordRuleList = useMemo(() => passwordChecks(form.password), [form.password]);
    const isPasswordValid = passwordRule.test(form.password);

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get('/superadmin/users');
            setUsers(data);
        } catch (error) {
            console.error('Fetch admin users failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        const nextValue = name === 'username' ? value.toLowerCase() : value;

        setForm((prev) => ({ ...prev, [name]: nextValue }));
        setFormError('');
        setFormSuccess('');

        if (name === 'username') {
            setUsernameCheck({ state: 'idle', message: '' });
        }
    };

    const handleCheckUsername = async () => {
        const username = form.username.trim();

        if (!username) {
            setUsernameCheck({ state: 'invalid', message: '아이디를 먼저 입력해 주세요.' });
            return;
        }

        if (!usernameRule.test(username)) {
            setUsernameCheck({
                state: 'invalid',
                message: '아이디는 4~20자의 영문 소문자, 숫자, 점(.), 밑줄(_), 하이픈(-)만 사용할 수 있습니다.'
            });
            return;
        }

        setUsernameCheck({ state: 'checking', message: '중복 확인 중입니다...' });

        try {
            const { data } = await axios.get('/superadmin/admins/check-username', {
                params: { username }
            });
            setUsernameCheck({
                state: data.available ? 'valid' : 'invalid',
                message: data.message
            });
        } catch (error) {
            setUsernameCheck({
                state: 'invalid',
                message: error.response?.data?.message || '아이디 중복 확인에 실패했습니다.'
            });
        }
    };

    const validateForm = () => {
        if (!usernameRule.test(form.username.trim())) {
            return '아이디 형식을 다시 확인해 주세요.';
        }

        if (!isPasswordValid) {
            return '비밀번호 규칙을 모두 충족해야 합니다.';
        }

        if (form.password !== form.confirmPassword) {
            return '비밀번호 확인이 일치하지 않습니다.';
        }

        if (form.name.trim().length < 2 || form.name.trim().length > 20) {
            return '이름은 2자 이상 20자 이하로 입력해 주세요.';
        }

        return null;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError('');
        setFormSuccess('');

        const validationMessage = validateForm();
        if (validationMessage) {
            setFormError(validationMessage);
            return;
        }

        setIsSubmitting(true);

        try {
            await axios.post('/superadmin/admins', {
                username: form.username.trim(),
                password: form.password,
                name: form.name.trim(),
                nickname: form.nickname.trim(),
                phone: form.phone.trim(),
                birthdate: form.birthdate,
                gender: form.gender
            });

            setForm(initialForm);
            setUsernameCheck({ state: 'idle', message: '' });
            setFormSuccess('관리자 계정을 생성했습니다.');
            fetchUsers();
        } catch (error) {
            setFormError(error.response?.data?.message || '관리자 계정 생성에 실패했습니다.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-8 text-[#e8e8f0]">
            <header className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="font-mono text-4xl font-bold text-white">
                        관리자 <span className="text-[#FF8C69]">계정 관리</span>
                    </h1>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#6b6b8a]">
                        SUPER ADMIN ADMIN DESK
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/superadmin/direct-chat')}
                    className="rounded-xl border border-[#06d6a0]/30 bg-[#06d6a0]/10 px-5 py-3 text-xs font-black tracking-[0.2em] text-[#7df0ce] transition hover:bg-[#06d6a0] hover:text-[#0b1f1a]"
                >
                    1:1 梨꾪똿
                </button>

                <button
                    type="button"
                    onClick={() => navigate('/superadmin/users')}
                    className="rounded-xl border border-white/10 px-5 py-3 text-xs font-black tracking-[0.2em] text-[#8b8ba7] transition hover:border-white/20 hover:text-white"
                >
                    전체 사용자 관리로 이동
                </button>
            </header>

            <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
                <section className="rounded-[2rem] border border-white/5 bg-[#12121a] p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-white">관리자 계정 생성</h2>
                        <p className="mt-2 text-sm leading-6 text-[#8b8ba7]">
                            이 페이지는 최고관리자에게만 노출됩니다. 로그인 화면과 일반 회원가입 화면에는 관리자 생성 경로를 두지 않습니다.
                        </p>
                    </div>

                    {formError && (
                        <div className="mb-5 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300">
                            {formError}
                        </div>
                    )}

                    {formSuccess && (
                        <div className="mb-5 rounded-2xl border border-[#06d6a0]/20 bg-[#06d6a0]/10 px-4 py-3 text-sm font-semibold text-[#7df0ce]">
                            {formSuccess}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid gap-5 md:grid-cols-[1fr_auto]">
                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">아이디</span>
                                <input
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="4~20자 영문 소문자, 숫자"
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>
                            <button
                                type="button"
                                onClick={handleCheckUsername}
                                className="self-end rounded-2xl border border-[#FF8C69]/30 bg-[#FF8C69]/10 px-5 py-4 text-xs font-black text-[#FF8C69] transition hover:bg-[#FF8C69] hover:text-white"
                            >
                                중복 확인
                            </button>
                        </div>

                        {usernameCheck.message && (
                            <div
                                className={`rounded-xl px-4 py-3 text-xs font-semibold ${
                                    usernameCheck.state === 'valid'
                                        ? 'bg-[#06d6a0]/10 text-[#7df0ce]'
                                        : usernameCheck.state === 'checking'
                                            ? 'bg-white/5 text-[#c9c9d6]'
                                            : 'bg-red-500/10 text-red-300'
                                }`}
                            >
                                {usernameCheck.message}
                            </div>
                        )}

                        <div className="grid gap-5 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">비밀번호</span>
                                <input
                                    type="password"
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="영문, 숫자, 특수문자 포함 8~20자"
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">비밀번호 확인</span>
                                <input
                                    type="password"
                                    name="confirmPassword"
                                    value={form.confirmPassword}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div className="grid gap-3 rounded-2xl border border-white/5 bg-[#0d0d14] p-4 md:grid-cols-2">
                            {passwordRuleList.map((rule) => (
                                <div
                                    key={rule.label}
                                    className={`text-xs font-semibold ${rule.passed ? 'text-[#7df0ce]' : 'text-[#8b8ba7]'}`}
                                >
                                    {rule.passed ? '통과' : '대기'} · {rule.label}
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-5 md:grid-cols-2">
                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">이름</span>
                                <input
                                    type="text"
                                    name="name"
                                    value={form.name}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">닉네임</span>
                                <input
                                    type="text"
                                    name="nickname"
                                    value={form.nickname}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>
                        </div>

                        <div className="grid gap-5 md:grid-cols-3">
                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">연락처</span>
                                <input
                                    type="text"
                                    name="phone"
                                    value={form.phone}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">생년월일</span>
                                <input
                                    type="date"
                                    name="birthdate"
                                    value={form.birthdate}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                            </label>

                            <label className="space-y-2">
                                <span className="block text-[10px] font-black tracking-widest text-[#6b6b8a]">성별</span>
                                <select
                                    name="gender"
                                    value={form.gender}
                                    onChange={handleChange}
                                    className="w-full rounded-2xl border border-white/10 bg-[#0d0d14] px-4 py-4 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                >
                                    <option value="none">미지정</option>
                                    <option value="male">남성</option>
                                    <option value="female">여성</option>
                                    <option value="other">기타</option>
                                </select>
                            </label>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-2xl border border-[#FF8C69]/30 bg-[#FF8C69]/10 px-6 py-4 text-xs font-black tracking-[0.2em] text-[#FF8C69] transition hover:bg-[#FF8C69] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isSubmitting ? '생성 중...' : '관리자 계정 생성'}
                            </button>
                        </div>
                    </form>
                </section>

                <section className="rounded-[2rem] border border-white/5 bg-[#12121a] p-8 shadow-2xl">
                    <div className="mb-8">
                        <h2 className="text-xl font-black text-white">현재 관리자 계정</h2>
                        <p className="mt-2 text-sm leading-6 text-[#8b8ba7]">
                            최고관리자와 관리자 계정만 따로 모아 봅니다.
                        </p>
                    </div>

                    {isLoading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map((item) => (
                                <div key={item} className="h-20 animate-pulse rounded-2xl border border-white/5 bg-[#0d0d14]" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {admins.map((user) => (
                                <div key={user._id} className="rounded-2xl border border-white/5 bg-[#0d0d14] p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-sm font-bold text-white">{user.name}</p>
                                            <p className="mt-1 font-mono text-[11px] text-[#8b8ba7]">{user.username}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <span
                                                className={`rounded-full border px-3 py-1 text-[9px] font-black ${
                                                    user.role === 'superadmin'
                                                        ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                                                        : 'border-[#FF8C69]/20 bg-[#FF8C69]/10 text-[#FF8C69]'
                                                }`}
                                            >
                                                {user.role === 'superadmin' ? '최고관리자' : '관리자'}
                                            </span>
                                            <span
                                                className={`rounded-full px-3 py-1 text-[9px] font-black ${
                                                    user.status === 'active'
                                                        ? 'bg-[#06d6a0]/10 text-[#7df0ce]'
                                                        : user.status === 'suspended'
                                                            ? 'bg-yellow-500/10 text-yellow-300'
                                                            : 'bg-red-500/10 text-red-300'
                                                }`}
                                            >
                                                {user.status === 'active' ? '활성' : user.status === 'suspended' ? '정지' : '탈퇴'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center justify-between text-[11px] text-[#6b6b8a]">
                                        <span>닉네임: {user.nickname || '없음'}</span>
                                        <span>{new Date(user.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default SuperAdminAdmins;
