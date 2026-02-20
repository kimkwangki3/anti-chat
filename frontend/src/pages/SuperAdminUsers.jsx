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
                    <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase italic text-white">
                        USER <span className="text-[#FF8C69]">DIRECTORY</span> 👑
                    </h1>
                    <p className="text-[#6b6b8a] text-[10px] font-bold uppercase tracking-[0.3em] ml-1">Master Membership Management</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    {/* Role Filter */}
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

                    {/* Search Input */}
                    <div className="relative group min-w-[300px]">
                        <input
                            type="text"
                            placeholder="이름 또는 아이디 검색..."
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
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">사용자</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">역할</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">가입일</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">상태</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">접속 IP</th>
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
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-[11px] font-bold text-[#6b6b8a] font-mono">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-1.5 h-1.5 rounded-full ${user.isOnline ? 'bg-[#06d6a0] shadow-[0_0_8px_#06d6a0]' : 'bg-gray-600'}`}></span>
                                                <span className={`text-[10px] font-black uppercase ${user.isOnline ? 'text-[#06d6a0]' : 'text-[#444466]'}`}>
                                                    {user.isOnline ? 'ONLINE' : 'OFFLINE'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-[10px] font-mono text-[#6b6b8a] truncate max-w-[150px]">
                                                {user.lastIp || 'N/A'}
                                            </p>
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
