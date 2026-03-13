import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

const roleLabelMap = {
    superadmin: '최고관리자',
    admin: '관리자',
    member: '일반회원'
};

const statusLabelMap = {
    active: '활성',
    suspended: '정지',
    withdrawn: '탈퇴'
};

const SuperAdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get('/superadmin/users');
            setUsers(data);
        } catch (error) {
            console.error('Fetch users failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStatusChange = async (userId, newStatus) => {
        if (!window.confirm(`이 사용자의 상태를 "${statusLabelMap[newStatus] || newStatus}"로 변경하시겠습니까?`)) {
            return;
        }

        try {
            await axios.put(`/superadmin/users/${userId}/status`, { status: newStatus });
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.message || '사용자 상태 변경에 실패했습니다.');
        }
    };

    const filteredUsers = users.filter((user) => {
        const query = searchTerm.toLowerCase();
        const safeName = user.name?.toLowerCase() || '';
        const safeUsername = user.username?.toLowerCase() || '';
        const matchesSearch = safeName.includes(query) || safeUsername.includes(query);
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0f] p-8 text-[#e8e8f0]">
            <header className="mb-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="font-mono text-4xl font-bold text-white">
                        사용자 <span className="text-[#FF8C69]">통합 관리</span>
                    </h1>
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.3em] text-[#6b6b8a]">
                        SUPER ADMIN USER DESK
                    </p>
                </div>

                <div className="flex flex-col gap-4 md:flex-row">
                    <button
                        type="button"
                        onClick={() => navigate('/superadmin/direct-chat')}
                        className="rounded-xl border border-[#06d6a0]/30 bg-[#06d6a0]/10 px-5 py-3 text-xs font-black tracking-[0.2em] text-[#7df0ce] transition hover:bg-[#06d6a0] hover:text-[#0b1f1a]"
                    >
                        1:1 梨꾪똿
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/superadmin/admins')}
                        className="rounded-xl border border-[#FF8C69]/30 bg-[#FF8C69]/10 px-5 py-3 text-xs font-black tracking-[0.2em] text-[#FF8C69] transition hover:bg-[#FF8C69] hover:text-white"
                    >
                        관리자 계정 관리
                    </button>

                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="cursor-pointer rounded-xl border border-white/10 bg-[#12121a] px-4 py-3 text-xs font-bold text-[#FF8C69] focus:border-[#FF8C69]/50 focus:outline-none"
                    >
                        <option value="all">전체 권한</option>
                        <option value="superadmin">최고관리자</option>
                        <option value="admin">관리자</option>
                        <option value="member">일반회원</option>
                    </select>

                    <input
                        type="text"
                        placeholder="이름 또는 아이디 검색"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="min-w-[280px] rounded-xl border border-white/10 bg-[#12121a] px-5 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                    />
                </div>
            </header>

            <div className="mb-6 rounded-2xl border border-[#FF8C69]/10 bg-[#12121a] p-5">
                <p className="text-sm font-semibold text-white">이 화면은 전체 사용자 조회와 상태 변경 전용입니다.</p>
                <p className="mt-2 text-xs leading-6 text-[#8b8ba7]">
                    관리자 계정 생성은 별도의 최고관리자 전용 페이지에서만 가능합니다. 로그인 화면에는 관리자 가입 기능을 노출하지 않습니다.
                </p>
            </div>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((item) => (
                        <div key={item} className="h-16 animate-pulse rounded-2xl border border-white/5 bg-[#12121a]" />
                    ))}
                </div>
            ) : (
                <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#12121a] shadow-2xl">
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-white/5 bg-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6b6b8a]">사용자</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6b6b8a]">권한</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6b6b8a]">가입일</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6b6b8a]">상태</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6b6b8a]">관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="group transition-colors hover:bg-white/[0.02]">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF8C69] to-[#E8735A] text-sm font-black text-white shadow-lg shadow-[#FF8C69]/20">
                                                    {(user.name || '?').slice(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white transition-colors group-hover:text-[#FF8C69]">
                                                        {user.name}
                                                    </p>
                                                    <p className="font-mono text-[10px] uppercase text-[#444466]">{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span
                                                className={`rounded-full border px-3 py-1 text-[9px] font-black tracking-tight ${
                                                    user.role === 'superadmin'
                                                        ? 'border-purple-500/20 bg-purple-500/10 text-purple-400'
                                                        : user.role === 'admin'
                                                            ? 'border-[#FF8C69]/20 bg-[#FF8C69]/10 text-[#FF8C69]'
                                                            : 'border-blue-500/20 bg-blue-500/10 text-blue-400'
                                                }`}
                                            >
                                                {roleLabelMap[user.role] || user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 font-mono text-[11px] font-bold text-[#6b6b8a]">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span
                                                className={`rounded-lg px-3 py-1 text-[9px] font-black tracking-widest ${
                                                    !user.status || user.status === 'active'
                                                        ? 'bg-[#06d6a0]/10 text-[#06d6a0]'
                                                        : user.status === 'suspended'
                                                            ? 'bg-yellow-500/10 text-yellow-500'
                                                            : 'bg-red-500/10 text-red-500'
                                                }`}
                                            >
                                                {statusLabelMap[user.status || 'active']}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap items-center gap-2">
                                                {user.role !== 'superadmin' && (
                                                    <>
                                                        {user.status !== 'active' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStatusChange(user._id, 'active')}
                                                                className="rounded-lg border border-[#06d6a0]/20 bg-[#06d6a0]/10 px-3 py-1.5 text-[10px] font-black text-[#06d6a0] transition hover:bg-[#06d6a0] hover:text-white"
                                                            >
                                                                활성화
                                                            </button>
                                                        )}
                                                        {user.status !== 'suspended' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStatusChange(user._id, 'suspended')}
                                                                className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 px-3 py-1.5 text-[10px] font-black text-yellow-500 transition hover:bg-yellow-500 hover:text-white"
                                                            >
                                                                정지
                                                            </button>
                                                        )}
                                                        {user.status !== 'withdrawn' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStatusChange(user._id, 'withdrawn')}
                                                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] font-black text-red-500 transition hover:bg-red-500 hover:text-white"
                                                            >
                                                                탈퇴 처리
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminUsers;
