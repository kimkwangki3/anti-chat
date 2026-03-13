import { useEffect, useMemo, useState } from 'react';
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

const genderLabelMap = {
    none: '미선택',
    male: '남성',
    female: '여성',
    other: '기타'
};

const emptyEditForm = {
    name: '',
    nickname: '',
    phone: '',
    birthdate: '',
    gender: 'none',
    memo: '',
    newPassword: '',
    confirmPassword: ''
};

const SuperAdminUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [editingUser, setEditingUser] = useState(null);
    const [editForm, setEditForm] = useState(emptyEditForm);
    const [isSaving, setIsSaving] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [isLoadingPassword, setIsLoadingPassword] = useState(false);

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
        const statusLabel = statusLabelMap[newStatus] || newStatus;
        if (!window.confirm(`사용자 상태를 "${statusLabel}"로 변경하시겠습니까?`)) return;

        try {
            await axios.put(`/superadmin/users/${userId}/status`, { status: newStatus });
            fetchUsers();
        } catch (error) {
            alert(error.response?.data?.message || '사용자 상태 변경에 실패했습니다.');
        }
    };

    const openEditModal = (user) => {
        setEditingUser(user);
        setCurrentPassword('');
        setEditForm({
            name: user.name || '',
            nickname: user.nickname || '',
            phone: user.phone || '',
            birthdate: user.birthdate || '',
            gender: user.gender || 'none',
            memo: user.memo || '',
            newPassword: '',
            confirmPassword: ''
        });
    };

    const closeEditModal = () => {
        setEditingUser(null);
        setEditForm(emptyEditForm);
        setCurrentPassword('');
        setIsSaving(false);
    };

    const loadCurrentPassword = async () => {
        if (!editingUser) return;
        setIsLoadingPassword(true);
        try {
            let data;
            try {
                const primary = await axios.get(`/superadmin/users/${editingUser._id}/password`);
                data = primary.data;
            } catch (primaryError) {
                const fallback = await axios.get(`/superadmin/users-password/${editingUser._id}`);
                data = fallback.data;
            }
            setCurrentPassword(data.password || '');
        } catch (error) {
            const serverMessage = error.response?.data?.message;
            const status = error.response?.status;
            alert(serverMessage || `현재 비밀번호 조회에 실패했습니다. (HTTP ${status || 'N/A'})`);
        } finally {
            setIsLoadingPassword(false);
        }
    };

    const submitEdit = async (e) => {
        e.preventDefault();
        if (!editingUser) return;

        if (editForm.newPassword || editForm.confirmPassword) {
            if (editForm.newPassword !== editForm.confirmPassword) {
                alert('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.');
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                name: editForm.name,
                nickname: editForm.nickname,
                phone: editForm.phone,
                birthdate: editForm.birthdate,
                gender: editForm.gender,
                memo: editForm.memo
            };

            if (editForm.newPassword.trim()) {
                payload.password = editForm.newPassword.trim();
            }

            await axios.put(`/superadmin/users/${editingUser._id}`, payload);
            await fetchUsers();
            closeEditModal();
            alert('회원 정보가 수정되었습니다.');
        } catch (error) {
            const serverMessage = error.response?.data?.message;
            const status = error.response?.status;
            alert(serverMessage || `회원 정보 수정에 실패했습니다. (HTTP ${status || 'N/A'})`);
        } finally {
            setIsSaving(false);
        }
    };

    const filteredUsers = useMemo(() => {
        return users.filter((user) => {
            const query = searchTerm.toLowerCase();
            const safeName = user.name?.toLowerCase() || '';
            const safeUsername = user.username?.toLowerCase() || '';
            const matchesSearch = safeName.includes(query) || safeUsername.includes(query);
            const matchesRole = roleFilter === 'all' || user.role === roleFilter;
            return matchesSearch && matchesRole;
        });
    }, [users, searchTerm, roleFilter]);

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
                        1:1 채팅
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
                <p className="text-sm font-semibold text-white">
                    회원 정보 수정, 비밀번호 변경, 메모 관리, 상태 변경을 이 화면에서 처리합니다.
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
                                    <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-[#6b6b8a]">정보</th>
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
                                                    <p className="text-sm font-bold text-white transition-colors group-hover:text-[#FF8C69]">{user.name}</p>
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
                                        <td className="px-8 py-6 text-xs text-[#8b8ba7]">
                                            <p>닉네임: {user.nickname || '-'}</p>
                                            <p>연락처: {user.phone || '-'}</p>
                                            <p>성별: {genderLabelMap[user.gender || 'none']}</p>
                                            <p className="truncate max-w-[260px]">메모: {user.memo || '-'}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => openEditModal(user)}
                                                    className="rounded-lg border border-[#5ba7ff]/30 bg-[#5ba7ff]/10 px-3 py-1.5 text-[10px] font-black text-[#8bc1ff] transition hover:bg-[#5ba7ff] hover:text-white"
                                                >
                                                    정보 수정
                                                </button>

                                                {user.role !== 'superadmin' && (
                                                    <>
                                                        {user.status !== 'active' && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleStatusChange(user._id, 'active')}
                                                                className="rounded-lg border border-[#06d6a0]/20 bg-[#06d6a0]/10 px-3 py-1.5 text-[10px] font-black text-[#06d6a0] transition hover:bg-[#06d6a0] hover:text-white"
                                                            >
                                                                활성
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

            {editingUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
                    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-[#12121a] p-6 shadow-2xl">
                        <h2 className="text-xl font-black text-white">회원 정보 수정</h2>
                        <p className="mt-1 text-xs text-[#8b8ba7]">{editingUser.username}</p>

                        <form className="mt-6 space-y-4" onSubmit={submitEdit}>
                            <div className="grid gap-4 md:grid-cols-2">
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">이름</span>
                                    <input
                                        value={editForm.name}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">닉네임</span>
                                    <input
                                        value={editForm.nickname}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, nickname: e.target.value }))}
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    />
                                </label>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">연락처</span>
                                    <input
                                        value={editForm.phone}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">생년월일</span>
                                    <input
                                        type="date"
                                        value={editForm.birthdate}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, birthdate: e.target.value }))}
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">성별</span>
                                    <select
                                        value={editForm.gender}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, gender: e.target.value }))}
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    >
                                        <option value="none">미선택</option>
                                        <option value="male">남성</option>
                                        <option value="female">여성</option>
                                        <option value="other">기타</option>
                                    </select>
                                </label>
                            </div>

                            <label className="space-y-2 block">
                                <span className="text-xs font-bold text-[#8b8ba7]">메모</span>
                                <textarea
                                    value={editForm.memo}
                                    onChange={(e) => setEditForm((prev) => ({ ...prev, memo: e.target.value }))}
                                    rows={3}
                                    maxLength={500}
                                    className="w-full resize-none rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                />
                                <span className="text-[11px] text-[#6b6b8a]">{editForm.memo.length}/500</span>
                            </label>

                            <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">새 비밀번호</span>
                                    <input
                                        type="text"
                                        value={editForm.newPassword}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                        placeholder="변경할 때만 입력"
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    />
                                </label>
                                <label className="space-y-2">
                                    <span className="text-xs font-bold text-[#8b8ba7]">비밀번호 확인</span>
                                    <input
                                        type="text"
                                        value={editForm.confirmPassword}
                                        onChange={(e) => setEditForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                        placeholder="새 비밀번호 재입력"
                                        className="w-full rounded-xl border border-white/10 bg-[#0d0d14] px-4 py-3 text-sm text-white focus:border-[#FF8C69]/50 focus:outline-none"
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={loadCurrentPassword}
                                    className="self-end rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs font-black text-yellow-300 transition hover:bg-yellow-500 hover:text-white"
                                >
                                    {isLoadingPassword ? '조회 중...' : '현재 비밀번호 확인'}
                                </button>
                            </div>

                            {currentPassword && (
                                <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                                    현재 비밀번호: <span className="font-bold">{currentPassword}</span>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeEditModal}
                                    className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold text-[#b8b8c8] transition hover:border-white/30 hover:text-white"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="rounded-xl border border-[#FF8C69]/30 bg-[#FF8C69]/10 px-4 py-2 text-sm font-bold text-[#FF8C69] transition hover:bg-[#FF8C69] hover:text-white disabled:opacity-50"
                                >
                                    {isSaving ? '저장 중...' : '저장'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminUsers;
