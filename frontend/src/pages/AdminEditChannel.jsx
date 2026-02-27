import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useChannelStore from '../store/channelStore';
import useAuthStore from '../store/authStore';
import axios from '../api/axios';

const AdminEditChannel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const channelId = queryParams.get('channelId');

    const { user } = useAuthStore();
    const { fetchChannelById, updateChannel, isLoading, error } = useChannelStore();

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        profileImage: '',
        cardColor: '#4f6ef7'
    });
    const [uploading, setUploading] = useState(false);

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
                        description: channel.description,
                        profileImage: channel.profileImage || '',
                        cardColor: channel.cardColor || '#4f6ef7'
                    });
                }
            }
        };
        loadChannel();
    }, [channelId, fetchChannelById, user, navigate]);

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);

        setUploading(true);
        try {
            const response = await axios.post('/channels/upload', uploadFormData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFormData({ ...formData, profileImage: response.data.imageUrl });
        } catch (error) {
            alert('이미지 업로드에 실패했습니다.');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await updateChannel(
            channelId,
            formData.name,
            formData.description,
            formData.profileImage,
            formData.cardColor
        );
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
                    className="text-[10px] font-black text-[#FF8C69] hover:text-[#E8735A] transition-colors uppercase tracking-[0.2em] mb-6 flex items-center gap-2 group font-mono"
                >
                    <span className="text-lg group-hover:-translate-x-1 transition-transform">←</span> 이전 페이지로
                </button>
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-mono uppercase">
                    채널 <span className="text-[#FF8C69]">정보</span> 수정
                </h1>
                <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em] ml-1">나만의 소중한 채널 정보를 관리하세요</p>
            </header>

            <div className="max-w-3xl bg-[#23232f] border border-white/5 rounded-[2.5rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#FF8C69]/5 rounded-bl-[6rem] -mr-12 -mt-12 group-hover:bg-[#FF8C69]/10 transition-colors"></div>

                <form onSubmit={handleSubmit} className="space-y-12 relative z-10">
                    <div className="flex flex-col md:flex-row gap-10">
                        <div className="space-y-4 flex-shrink-0">
                            <label className="block text-[10px] font-black text-[#5a5a6a] uppercase tracking-[0.3em] ml-2 italic font-mono">Channel Icon</label>
                            <div className="relative group/avatar">
                                <div className="w-32 h-32 rounded-3xl bg-[#1a1a24] border border-white/5 flex items-center justify-center overflow-hidden shadow-inner relative">
                                    {formData.profileImage ? (
                                        <img src={formData.profileImage} alt="Channel Icon" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl">📡</span>
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <div className="w-6 h-6 border-2 border-[#FF8C69] border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                    )}
                                </div>
                                <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FF8C69] rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg text-white">
                                    <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*" />
                                    <span className="text-xl">📸</span>
                                </label>
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <label className="block text-[10px] font-black text-[#5a5a6a] uppercase tracking-[0.3em] ml-2 italic font-mono">Channel Style</label>
                            <div className="p-6 bg-[#1a1a24] border border-white/5 rounded-3xl shadow-inner space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-[#6b6b8a] uppercase tracking-widest font-mono">Card Accent Color</span>
                                    <input
                                        type="color"
                                        value={formData.cardColor}
                                        onChange={(e) => setFormData({ ...formData, cardColor: e.target.value })}
                                        className="w-12 h-12 rounded-xl bg-transparent border-none cursor-pointer overflow-hidden p-0"
                                    />
                                </div>
                                <div
                                    className="h-1 rounded-full opacity-50 transition-all duration-500"
                                    style={{ background: `linear-gradient(to right, ${formData.cardColor}, transparent)` }}
                                ></div>
                                <p className="text-[9px] text-[#44445a] font-mono leading-relaxed">
                                    이 색상은 채널 검색 시 카드 하이라이트와 테두리에 적용됩니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#5a5a6a] uppercase tracking-[0.3em] ml-2 italic font-mono">Channel Identity</label>
                        <div className="relative group/input">
                            <div className="absolute -inset-0.5 orange-gradient rounded-2xl blur opacity-[0.05] group-focus-within/input:opacity-20 transition duration-500 pointer-events-none"></div>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-[#1a1a24] border border-white/5 rounded-2xl px-8 py-5 text-white text-sm font-bold focus:outline-none focus:border-[#FF8C69]/30 transition-all shadow-inner font-mono"
                                placeholder="채널의 이름을 정해주세요"
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="block text-[10px] font-black text-[#5a5a6a] uppercase tracking-[0.3em] ml-2 italic font-mono">Channel Story</label>
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
                            className="flex-1 py-5 bg-[#1a1a24] border border-white/5 text-[#6b6b8a] text-[10px] font-black rounded-2xl hover:bg-white/5 transition-all uppercase tracking-widest shadow-lg font-mono"
                        >
                            변경 취소
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-5 orange-gradient text-white text-[10px] font-black rounded-2xl shadow-xl shadow-[#FF8C69]/20 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] font-mono"
                        >
                            시스템 설정 업데이트 ✨
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminEditChannel;
