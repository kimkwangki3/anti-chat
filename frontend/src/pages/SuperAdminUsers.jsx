import { useState, useEffect } from 'react';
import axios from '../api/axios';

const SuperAdminUsers = () => {
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
        if (!window.confirm(`사용자 상태를 ${newStatus}로 변경하시겠습니까?`)) return;
        try {
            await axios.put(`/superadmin/users/${userId}/status`, { status: newStatus });
            fetchUsers(); // 목록 새로고침
        } catch (error) {
            alert('상태 변경에 실패했습니다: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.username.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'all' || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase italic text-white font-mono">
                        시스템 <span className="text-[#FF8C69]">사용자</span> 부 👑
                    </h1>
                    <p className="text-[#6b6b8a] text-[10px] font-bold uppercase tracking-[0.3em] ml-1">마스터 레벨 유저 권한 제어</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="bg-[#12121a] border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-[#FF8C69] focus:outline-none focus:border-[#FF8C69]/50 transition-all appearance-none cursor-pointer"
                    >
                        <option value="all">전체 역할</option>
                        <option value="superadmin">최고관리자</option>
                        <option value="admin">채널 관리자</option>
                        <option value="member">일반 회원</option>
                    </select>

                    <div className="relative group min-w-[300px]">
                        <input
                            type="text"
                            placeholder="이름 또는 아이디로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#12121a] border border-white/10 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FF8C69] transition-colors">🔍</span>
                    </div>
                </div>
            </header>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className="h-16 bg-[#12121a] rounded-2xl animate-pulse border border-white/5"></div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#12121a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">사용자 정보</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">권한 등급</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">가입일시</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">현재 상태</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">관리 액션</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FF8C69] to-[#E8735A] flex items-center justify-center text-white font-black text-sm shadow-lg shadow-[#FF8C69]/20">
                                                    {user.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white group-hover:text-[#FF8C69] transition-colors">{user.name}</p>
                                                    <p className="text-[10px] font-mono text-[#444466] uppercase">{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tight ${user.role === 'superadmin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                                                user.role === 'admin' ? 'bg-[#FF8C69]/10 text-[#FF8C69] border border-[#FF8C69]/20' :
                                                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                }`}>
                                                {user.role === 'superadmin' ? '최고관리자' : user.role === 'admin' ? '관리자' : '일반회원'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-[11px] font-bold text-[#6b6b8a] font-mono">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${user.status === 'active' || !user.status ? 'bg-[#06d6a0]/10 text-[#06d6a0]' :
                                                user.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {(!user.status || user.status === 'active') ? '활성' : user.status === 'suspended' ? '정지' : '탈퇴/만료'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                {user.role !== 'superadmin' && (
                                                    <>
                                                        {(user.status && user.status !== 'active') && (
                                                            <button
                                                                onClick={() => handleStatusChange(user._id, 'active')}
                                                                className="px-3 py-1.5 bg-[#06d6a0]/10 hover:bg-[#06d6a0] text-[#06d6a0] hover:text-white rounded-lg transition-all text-[10px] font-black border border-[#06d6a0]/20"
                                                            >
                                                                활성화
                                                            </button>
                                                        )}
                                                        {user.status !== 'suspended' && (
                                                            <button
                                                                onClick={() => handleStatusChange(user._id, 'suspended')}
                                                                className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-white rounded-lg transition-all text-[10px] font-black border border-yellow-500/20"
                                                            >
                                                                정지
                                                            </button>
                                                        )}
                                                        {user.status !== 'withdrawn' && (
                                                            <button
                                                                onClick={() => handleStatusChange(user._id, 'withdrawn')}
                                                                className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all text-[10px] font-black border border-red-500/20"
                                                            >
                                                                추방
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
