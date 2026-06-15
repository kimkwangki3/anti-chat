import { useState, useEffect } from 'react';
import useChannelStore from '../../store/channelStore';
import useAuthStore from '../../store/authStore';
import axios from '../../api/axios';

const ChannelCreateModal = ({ isOpen, onClose, onCreated }) => {
    const [formData, setFormData] = useState({ name: '', description: '', ownerId: '' });
    const [admins, setAdmins] = useState([]);
    const { createChannel } = useChannelStore();
    const { user, checkAuth } = useAuthStore();

    const isSuperAdmin = user?.role === 'superadmin';

    // 슈퍼어드민이면 배정 가능한 관리자(admin) 목록 조회
    useEffect(() => {
        if (isOpen && isSuperAdmin) {
            axios.get('/superadmin/users')
                .then((res) => setAdmins((res.data || []).filter((u) => u.role === 'admin')))
                .catch(() => setAdmins([]));
        }
    }, [isOpen, isSuperAdmin]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const payload = { name: formData.name, description: formData.description };
        if (formData.ownerId) payload.ownerId = formData.ownerId;

        const success = await createChannel(payload);
        if (success) {
            await checkAuth();
            onClose();
            setFormData({ name: '', description: '', ownerId: '' });
            if (onCreated) onCreated();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#12121a] border border-[rgba(255,140,105,0.2)] rounded-2xl p-8 shadow-2xl">
                <h2 className="text-2xl font-bold tracking-wider text-white mb-6 uppercase">CREATE NEW <span className="text-[#FF8C69]">CHANNEL</span></h2>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-[#444466] uppercase tracking-widest mb-2 ml-1">채널 이름</label>
                        <input
                            type="text"
                            required
                            placeholder="예: 프로젝트 A 협업 채널"
                            className="w-full bg-[#1a1a28] border border-white/5 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69] transition-all"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-[#444466] uppercase tracking-widest mb-2 ml-1">채널 설명</label>
                        <textarea
                            required
                            placeholder="채널의 목적과 규칙을 설명해 주세요."
                            rows="4"
                            className="w-full bg-[#1a1a28] border border-white/5 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69] transition-all"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        ></textarea>
                    </div>

                    {isSuperAdmin && (
                        <div>
                            <label className="block text-xs font-bold text-[#444466] uppercase tracking-widest mb-2 ml-1">채널 관리자 배정 (선택)</label>
                            <select
                                className="w-full bg-[#1a1a28] border border-white/5 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69] transition-all"
                                value={formData.ownerId}
                                onChange={(e) => setFormData({ ...formData, ownerId: e.target.value })}
                            >
                                <option value="">— 최고관리자(나)가 직접 관리 —</option>
                                {admins.map((a) => (
                                    <option key={a.id} value={a.id}>{a.name} ({a.username})</option>
                                ))}
                            </select>
                            <p className="mt-2 ml-1 text-[10px] text-[#6b6b8a]">나중에 채널 목록에서 다시 변경할 수 있습니다.</p>
                        </div>
                    )}

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
                            className="flex-1 py-3 orange-gradient text-white font-bold rounded-lg hover:scale-105 transition-transform shadow-lg shadow-[#FF8C69]/20"
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
