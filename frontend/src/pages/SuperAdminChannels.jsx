import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import ChannelCreateModal from '../components/Common/ChannelCreateModal';

const SuperAdminChannels = () => {
    const [channels, setChannels] = useState([]);
    const [admins, setAdmins] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        fetchChannels();
        fetchAdmins();
    }, []);

    const fetchChannels = async () => {
        try {
            const { data } = await axios.get('/superadmin/channels');
            setChannels(data);
        } catch (error) {
            console.error('Fetch channels failed:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAdmins = async () => {
        try {
            const { data } = await axios.get('/superadmin/users');
            // 채널에 배정 가능한 계정: 관리자 + 최고관리자
            setAdmins((data || []).filter((u) => u.role === 'admin' || u.role === 'superadmin'));
        } catch (error) {
            console.error('Fetch admins failed:', error);
        }
    };

    const handleStatusChange = async (channelId, newStatus) => {
        const confirmMsg = newStatus === 'deleted'
            ? '채널을 영구 삭제하시겠습니까? 관련 데이터가 모두 삭제되지는 않지만 검색에서 제외됩니다.'
            : `채널 상태를 ${newStatus === 'suspended' ? '임시패쇄' : '활성화'}로 변경하시겠습니까?`;

        if (!window.confirm(confirmMsg)) return;

        try {
            await axios.put(`/superadmin/channels/${channelId}/status`, { status: newStatus });
            fetchChannels();
        } catch (error) {
            alert('상태 변경에 실패했습니다: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleAssignAdmin = async (channelId, ownerId) => {
        if (!ownerId) return;
        try {
            const { data } = await axios.put(`/superadmin/channels/${channelId}/owner`, { ownerId: Number(ownerId) });
            alert(data.message || '채널 관리자가 배정되었습니다.');
            fetchChannels();
        } catch (error) {
            alert('관리자 배정에 실패했습니다: ' + (error.response?.data?.message || error.message));
        }
    };

    const filteredChannels = channels.filter(channel =>
        channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (channel.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 uppercase text-white">
                        시스템 <span className="text-[#FF8C69]">채널</span> 관 🛰️
                    </h1>
                    <p className="text-[#6b6b8a] text-[10px] font-bold uppercase tracking-[0.3em] ml-1">전체 네트워크 서비스 모니터링</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group min-w-[260px]">
                        <input
                            type="text"
                            placeholder="채널 이름 또는 설명으로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-[#12121a] border border-white/10 rounded-xl px-6 py-3 text-sm text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all font-medium"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[#FF8C69] transition-colors">🔍</span>
                    </div>
                    <button
                        onClick={() => setIsCreateOpen(true)}
                        className="shrink-0 orange-gradient text-white font-bold rounded-xl px-5 py-3 text-sm hover:scale-105 transition-transform shadow-lg shadow-[#FF8C69]/20"
                    >
                        + 채널 생성
                    </button>
                </div>
            </header>

            {isLoading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-[#12121a] rounded-2xl animate-pulse border border-white/5"></div>
                    ))}
                </div>
            ) : (
                <div className="bg-[#12121a] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl">
                    <div className="overflow-x-auto overflow-y-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-white/5 border-b border-white/5">
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">채널 메타데이터</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">담당 관리자</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">서비스 상태</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">통계 데이터</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-[#6b6b8a] uppercase tracking-widest">정밀 관리</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredChannels.map((channel) => (
                                    <tr key={channel._id || channel.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-[#FF8C69]/10 flex items-center justify-center text-2xl border border-[#FF8C69]/10">
                                                    🏘️
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-base font-bold text-white group-hover:text-[#FF8C69] transition-colors cursor-pointer"
                                                        onClick={() => navigate(`/superadmin/channels/${channel._id || channel.id}`)}>
                                                        {channel.name}
                                                    </p>
                                                    <p className="text-[10px] text-[#6b6b8a] truncate max-w-[200px] font-medium mt-0.5">{channel.description}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <select
                                                value={channel.ownerId || ''}
                                                onChange={(e) => handleAssignAdmin(channel._id || channel.id, e.target.value)}
                                                className="bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#FF8C69]/50 transition-all max-w-[180px]"
                                            >
                                                {!admins.some((a) => a.id === channel.ownerId) && (
                                                    <option value={channel.ownerId || ''}>현재 담당자 (id:{channel.ownerId})</option>
                                                )}
                                                {admins.map((a) => (
                                                    <option key={a.id} value={a.id}>
                                                        {a.role === 'superadmin' ? '👑 ' : ''}{a.name} ({a.username})
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${channel.status === 'active' || !channel.status ? 'bg-[#06d6a0]/10 text-[#06d6a0]' :
                                                channel.status === 'suspended' ? 'bg-yellow-500/10 text-yellow-500' :
                                                    'bg-red-500/10 text-red-500'
                                                }`}>
                                                {(!channel.status || channel.status === 'active') ? '활성' : channel.status === 'suspended' ? '정지' : '폐쇄/삭제'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex gap-3 text-[10px] font-bold text-[#6b6b8a] font-mono">
                                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                                    <span className="opacity-40">MEM</span> <span>{channel.stats?.memberCount || 0}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-md">
                                                    <span className="opacity-40">POST</span> <span>{channel.stats?.postCount || 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => navigate(`/superadmin/channels/${channel._id || channel.id}`)}
                                                    className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500 text-purple-400 hover:text-white rounded-lg transition-all text-[10px] font-black border border-purple-500/20 uppercase"
                                                >
                                                    콘텐츠 관리
                                                </button>
                                                <button
                                                    onClick={() => navigate(`/admin/login-settings?channelId=${channel._id || channel.id}`)}
                                                    className="px-3 py-1.5 bg-[#FF8C69]/10 hover:bg-[#FF8C69] text-[#FF8C69] hover:text-white rounded-lg transition-all text-[10px] font-black border border-[#FF8C69]/20 uppercase"
                                                >
                                                    로그인설정
                                                </button>
                                                <div className="w-px h-6 bg-white/5 mx-1"></div>
                                                {(channel.status && channel.status !== 'active') && (
                                                    <button
                                                        onClick={() => handleStatusChange(channel._id || channel.id, 'active')}
                                                        className="px-3 py-1.5 bg-[#06d6a0]/10 hover:bg-[#06d6a0] text-[#06d6a0] hover:text-white rounded-lg transition-all text-[10px] font-black border border-[#06d6a0]/20"
                                                    >
                                                        활성화
                                                    </button>
                                                )}
                                                {channel.status !== 'suspended' && (
                                                    <button
                                                        onClick={() => handleStatusChange(channel._id || channel.id, 'suspended')}
                                                        className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-white rounded-lg transition-all text-[10px] font-black border border-yellow-500/20"
                                                    >
                                                        정지
                                                    </button>
                                                )}
                                                {channel.status !== 'deleted' && (
                                                    <button
                                                        onClick={() => handleStatusChange(channel._id || channel.id, 'deleted')}
                                                        className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-lg transition-all text-[10px] font-black border border-red-500/20"
                                                    >
                                                        삭제
                                                    </button>
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

            <ChannelCreateModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onCreated={fetchChannels}
            />
        </div>
    );
};

export default SuperAdminChannels;
