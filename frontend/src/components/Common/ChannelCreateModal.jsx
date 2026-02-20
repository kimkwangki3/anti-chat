import { useState } from 'react';
import useChannelStore from '../../store/channelStore';
import useAuthStore from '../../store/authStore';

const ChannelCreateModal = ({ isOpen, onClose }) => {
    const [formData, setFormData] = useState({ name: '', description: '' });
    const { createChannel } = useChannelStore();
    const { checkAuth } = useAuthStore();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const success = await createChannel(formData);
        if (success) {
            // 서버에서 대화명이 '{채널명} 관리자'로 변경됐으므로 user 정보 갱신
            await checkAuth();
            onClose();
            setFormData({ name: '', description: '' });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#12121a] border border-[rgba(79,110,247,0.2)] rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold font-['Bebas_Neue'] tracking-wider text-white mb-6 uppercase italic">CREATE NEW <span className="text-[#4f6ef7]">CHANNEL</span></h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-bold text-[#444466] uppercase tracking-widest mb-2 font-mono ml-1">채널 이름</label>
                        <input
                            type="text"
                            required
                            placeholder="예: 프로젝트 A 협업 채널"
                            className="w-full bg-[#1a1a28] border border-[rgba(79,110,247,0.15)] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#4f6ef7] transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-bold text-[#444466] uppercase tracking-widest mb-2 font-mono ml-1">채널 설명</label>
                        <textarea
                            required
                            placeholder="채널의 목적과 규칙을 설명해 주세요."
                            rows="4"
                            className="w-full bg-[#1a1a28] border border-[rgba(79,110,247,0.15)] rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#4f6ef7] transition-all"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-[#1a1a28] text-[#6b6b8a] font-bold rounded-lg border border-white/5 hover:bg-[#252535] transition-all"
                        >
                            취소
                        </button>
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-[#4f6ef7] text-white font-bold rounded-lg hover:bg-[#7bb3ff] transition-all shadow-lg shadow-[#4f6ef7]/20"
                        >
                            채널 생성하기
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChannelCreateModal;
