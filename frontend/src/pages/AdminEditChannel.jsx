import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useChannelStore from '../store/channelStore';
import useAuthStore from '../store/authStore';

const AdminEditChannel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    const { user } = useAuthStore();
    const { fetchChannelById, updateChannel, isLoading, error } = useChannelStore();

    const [formData, setFormData] = useState({
        name: '',
        description: ''
    });

    useEffect(() => {
        const loadChannel = async () => {
            if (channelId) {
                const channel = await fetchChannelById(channelId);
                if (channel) {
                    if (channel.ownerId?._id !== user?._id) {
                        alert('권한이 없습니다.');
                        navigate('/');
                        return;
                    }
                    setFormData({
                        name: channel.name,
                        description: channel.description
                    });
                }
            }
        };
        loadChannel();
    }, [channelId, fetchChannelById, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await updateChannel(channelId, formData.name, formData.description);
        if (success) {
            alert('채널 정보가 수정되었습니다.');
            navigate('/');
        }
    };

    if (isLoading) return <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-white font-mono">LOADING...</div>;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-[#e8e8f0] p-8 overflow-y-auto">
            <header className="mb-12">
                <button
                    onClick={() => navigate(-1)}
                    className="text-[10px] font-bold text-[#4f6ef7] hover:underline uppercase tracking-widest mb-4"
                >
                    ← 뒤로 가기
                </button>
                <h1 className="text-4xl font-bold font-['Bebas_Neue'] tracking-wider uppercase italic text-white">
                    EDIT <span className="text-[#4f6ef7]">CHANNEL INFO</span>
                </h1>
                <p className="text-[#6b6b8a] text-[10px] font-mono tracking-[0.3em] uppercase mt-2">채널 정보 수정 및 업데이트</p>
            </header>

            <div className="max-w-2xl bg-[#12121a] border border-[rgba(79,110,247,0.15)] rounded-2xl p-10 shadow-2xl">
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-[10px] font-bold text-[#444466] uppercase tracking-[0.2em] mb-3 font-mono ml-1">채널 이름</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-[#1a1a28] border border-white/5 rounded-xl px-5 py-4 text-white text-sm focus:outline-none focus:border-[#4f6ef7] transition-all"
                            placeholder="채널 이름을 입력하세요"
                        />
                    </div>

                    <div>
                        <label className="block text-[10px] font-bold text-[#444466] uppercase tracking-[0.2em] mb-3 font-mono ml-1">채널 설명</label>
                        <textarea
                            required
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-[#1a1a28] border border-white/5 rounded-xl px-5 py-4 text-white text-sm focus:outline-none focus:border-[#4f6ef7] transition-all min-h-[120px] leading-relaxed"
                            placeholder="채널에 대한 설명을 입력하세요"
                        />
                    </div>

                    {error && <p className="text-red-500 text-xs font-mono">{error}</p>}

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 py-4 border border-white/5 text-[#6b6b8a] font-bold rounded-xl hover:bg-white/5 transition-all uppercase text-xs tracking-widest"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] bg-[#4f6ef7] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#4f6ef7]/20 hover:bg-[#7bb3ff] transition-all uppercase text-xs tracking-widest"
                        >
                            정보 수정 완료
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditChannel;
