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

    if (isLoading) return (
        <div className="h-full flex items-center justify-center bg-[#1a1a24] text-[#FF8C69]">
            <div className="animate-bounce text-4xl italic font-black font-mono uppercase tracking-widest">Loading...</div>
        </div>
    );

    return (
        <div className="h-full bg-[#1a1a24] overflow-y-auto custom-scrollbar p-6 md:p-12">
            <header className="mb-12">
                <button
                    onClick={() => navigate(-1)}
                    className="text-[10px] font-black text-[#FF8C69] hover:text-[#E8735A] transition-colors uppercase tracking-[0.2em] mb-6 flex items-center gap-2 group"
                >
                    <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span> Return Back
                </button>
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-mono uppercase">
                    Edit <span className="text-[#FF8C69]">Channel Info</span>
                </h1>
                <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em] ml-1">나만의 소중한 채널 정보를 관리하세요</p>
            </header>

            <div className="max-w-3xl bg-[#23232f] border border-white/5 rounded-[2.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF8C69]/5 rounded-bl-[6rem] -mr-12 -mt-12 group-hover:bg-[#FF8C69]/10 transition-colors"></div>

                <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#5a5a6a] uppercase tracking-[0.3em] ml-2 italic">Channel Identity</label>
                        <div className="relative group/input">
                            <div className="absolute -inset-0.5 orange-gradient rounded-2xl blur opacity-[0.05] group-focus-within/input:opacity-20 transition duration-500 pointer-events-none"></div>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-8 py-5 text-white text-sm font-bold focus:outline-none focus:border-[#FF8C69]/30 transition-all shadow-inner"
                                placeholder="채널의 이름을 정해주세요"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#5a5a6a] uppercase tracking-[0.3em] ml-2 italic">Channel Story</label>
                        <div className="relative group/input">
                            <div className="absolute -inset-0.5 orange-gradient rounded-3xl blur opacity-[0.05] group-focus-within/input:opacity-20 transition duration-500 pointer-events-none"></div>
                            <textarea
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-[#1a1a24] border border-white/5 rounded-[2rem] px-8 py-6 text-white text-sm font-medium focus:outline-none focus:border-[#FF8C69]/30 transition-all shadow-inner min-h-[180px] leading-relaxed"
                                placeholder="채널을 멋지게 설명해 보세요"
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest font-mono italic">{error}</p>}

                    <div className="flex gap-6 pt-4">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="flex-1 py-5 bg-[#1a1a24] border border-white/5 text-[#6b6b8a] text-[10px] font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest shadow-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-5 orange-gradient text-white text-[10px] font-black rounded-2xl shadow-xl shadow-[#FF8C69]/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em]"
                        >
                            Update Channel Settings ✨
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditChannel;
