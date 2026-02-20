import { useState, useEffect } from 'react';
import axios from '../api/axios';
import { useNavigate } from 'react-router-dom';

const SuperAdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const { data } = await axios.get('/superadmin/users');
            setUsers(data);
        } catch (error) {
            console.error('Fetch users failed:', error);
            alert('사용자 목록을 불러오는데 실패했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full bg-[#1a1a24] p-6 md:p-10 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono mb-2">User Directory 👑</h1>
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em]">Master membership management</p>
                </div>

                <div className="relative w-full md:w-80">
                    <input
                        type="text"
                        placeholder="이름 또는 아이디 검색"
                        className="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50 transition-all placeholder:text-[#3a3a4a]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 opacity-30">🔍</span>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-64 text-[#FF8C69]">
                    <div className="w-10 h-10 border-4 border-current border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredUsers.map((user) => (
                        <div
                            key={user._id}
                            className={`bg-[#23232f] border border-white/5 rounded-[2rem] p-6 shadow-xl relative overflow-hidden group hover:border-[#FF8C69]/30 transition-all`}
                        >
                            <div className="flex items-center gap-5 relative z-10">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg ${user.role === 'superadmin' ? 'bg-purple-500 shadow-purple-500/20' :
                                    user.role === 'admin' ? 'bg-[#FF8C69] shadow-[#FF8C69]/20' :
                                        'bg-blue-500 shadow-blue-500/20'
                                    }`}>
                                    {user.name.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white font-bold truncate">{user.name}</h3>
                                    <p className="text-[10px] text-[#6b6b8a] font-mono uppercase tracking-wider">{user.username}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${user.role === 'superadmin' ? 'bg-purple-500/10 text-purple-400' :
                                    user.role === 'admin' ? 'bg-[#FF8C69]/10 text-[#FF8C69]' :
                                        'bg-blue-500/10 text-blue-400'
                                    }`}>
                                    {user.role}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-white/5 flex items-center justify-between">
                                <div className="text-[10px] text-[#4a4a6a] font-mono">
                                    <p>JOINED: {new Date(user.createdAt).toLocaleDateString()}</p>
                                    <p>IP: {user.lastLoginIp || 'N/A'}</p>
                                </div>
                                {user.isOnline && (
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                        <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Online</span>
                                    </div>
                                )}
                            </div>

                            {/* Role Label background */}
                            <div className="absolute -bottom-4 -right-4 opacity-[0.03] scale-150 font-black italic uppercase pointer-events-none">
                                {user.role}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {filteredUsers.length === 0 && !isLoading && (
                <div className="flex flex-col items-center justify-center h-64 text-[#6b6b8a]">
                    <span className="text-4xl mb-4">🛸</span>
                    <p className="text-sm font-bold uppercase tracking-widest">사용자를 찾을 수 없습니다.</p>
                </div>
            )}
        </div>
    );
};

export default SuperAdminUsers;
