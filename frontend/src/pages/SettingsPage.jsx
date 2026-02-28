import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import axios from '../api/axios';
import useChannelStore from '../store/channelStore';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, logout, uploadProfileImage } = useAuthStore();
    const { myChannels } = useChannelStore();
    const { soundType, volume, setSoundType, setVolume, sounds } = useSettingsStore();

    // 관리자가 소유한 채널 확인
    const ownedChannelId = myChannels.find(m =>
        (m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id)
    )?.channelId?._id;

    const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
    const [isSubscribing, setIsSubscribing] = useState(false);

    // 프로필 이미지
    const fileInputRef = useRef(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const handleSubscribe = async () => {
        setIsSubscribing(true);
        try {
            if (typeof Notification === 'undefined') {
                alert('이 브라우저는 웹 푸시 알림을 지원하지 않습니다. iOS라면 홈 화면에 추가 후 다시 시도해 주세요.');
                setIsSubscribing(false);
                return;
            }
            const permission = await Notification.requestPermission();
            setPushStatus(permission);
            if (permission === 'granted') {
                const registration = await navigator.serviceWorker.ready;
                const { data } = await axios.get('/push/vapid-key');

                const subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(data.publicKey)
                });

                await axios.post('/push/subscribe', { subscription });
                alert('푸시 알림 구독 완료! 이제 새로운 소식을 실시간으로 받을 수 있습니다. 🍑');
            } else {
                alert('알림 권한이 거부되었습니다. 설정에서 알림을 허용해 주세요.');
            }
        } catch (err) {
            console.error('Push subscription failed:', err);
            alert('알림 구독 중 오류가 발생했습니다. (PWA 홈 화면 추가 여부를 확인해 주세요)');
        }
        setIsSubscribing(false);
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setSelectedFile(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result);
        reader.readAsDataURL(file);
    };

    const handleUploadImage = async () => {
        if (!selectedFile) return;
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('profileImage', selectedFile);
        const result = await uploadProfileImage(formData);
        if (result.success) {
            alert('프로필 사진이 변경되었습니다! 🍑');
            setPreviewImage(null);
            setSelectedFile(null);
        } else {
            alert('이미지 업로드에 실패했습니다.');
        }
        setIsUploadingImage(false);
    };

    const handleCancelImagePreview = () => {
        setPreviewImage(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const playPreview = (type) => {
        const audio = new Audio(sounds[type || soundType]);
        audio.volume = volume;
        audio.play().catch(e => console.log('Preview blocked:', e));
    };

    const soundOptions = [
        { id: 'peach', label: '복숭아 팝 (기본)', icon: '🍑' },
        { id: 'crystal', label: '크리스탈 딩', icon: '💎' },
        { id: 'knock', label: '깔끔한 노크', icon: '🚪' },
    ];

    const displayImage = previewImage || user?.profileImage;

    return (
        <div className="bg-[#1a1a24] p-6 md:p-12">
            {/* Header */}
            <div className="max-w-2xl mx-auto mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono mb-2">환경 설정</h1>
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em]">개인 맞춤형 연결 및 보안 설정</p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all font-bold"
                >
                    ✕
                </button>
            </div>

            <div className="max-w-2xl mx-auto space-y-8 pb-32">
                {/* Admin Section */}
                {(user?.role === 'admin' || user?.role === 'superadmin') && ownedChannelId && (
                    <section className="bg-gradient-to-br from-[#FF8C69]/20 to-[#E8735A]/5 rounded-[2.5rem] p-8 border border-[#FF8C69]/30 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
                            <span className="text-8xl font-black italic uppercase font-mono leading-none text-[#FF8C69]">ADMIN</span>
                        </div>
                        <h3 className="text-xs font-black text-[#FF8C69] uppercase tracking-[0.3em] mb-6 flex items-center gap-2 font-mono">
                            👑 채널 마스터 엔진
                        </h3>
                        <div className="grid grid-cols-1 gap-3 relative z-10">
                            <button
                                onClick={() => navigate(`/admin/members?channelId=${ownedChannelId}`)}
                                className="w-full py-5 bg-[#FF8C69] text-white rounded-2xl text-sm font-black flex items-center justify-center gap-3 shadow-xl shadow-[#FF8C69]/20 active:scale-95 transition-all uppercase tracking-widest"
                            >
                                👥 채널 멤버 매니지먼트
                            </button>
                            <button
                                onClick={() => navigate(`/admin/edit-channel?channelId=${ownedChannelId}`)}
                                className="w-full py-5 bg-white/5 text-[#FF8C69] border border-[#FF8C69]/20 rounded-2xl text-sm font-black flex items-center justify-center gap-3 active:scale-95 transition-all uppercase tracking-widest"
                            >
                                ⚙️ 코어 시스템 상세 구성
                            </button>
                        </div>
                    </section>
                )}

                {/* ===== PROFILE SECTION - 일반 멤버만 표시 ===== */}
                {!(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                            <span className="text-8xl font-black italic uppercase font-mono leading-none">IDENTITY</span>
                        </div>

                        <h3 className="text-xs font-black text-[#FF8C69] uppercase tracking-[0.3em] mb-8 flex items-center gap-2 font-mono">
                            <span className="w-2 h-2 bg-[#FF8C69] rounded-full animate-pulse"></span>
                            프로필 편집
                        </h3>

                        {/* 프로필 사진 영역 */}
                        <div className="flex flex-col items-center gap-4 relative z-10">
                            {/* 아바타 */}
                            <div className="relative">
                                <div className="w-28 h-28 rounded-[2rem] overflow-hidden shadow-2xl shadow-[#FF8C69]/20 border-2 border-white/10">
                                    {displayImage ? (
                                        <img
                                            src={displayImage}
                                            alt="프로필 사진"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full orange-gradient flex items-center justify-center text-4xl font-black text-white">
                                            {user?.name?.[0]?.toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                {!previewImage && (
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="absolute -bottom-2 -right-2 w-9 h-9 bg-[#FF8C69] rounded-xl flex items-center justify-center text-white text-sm shadow-lg hover:bg-[#ffaa33] active:scale-95 transition-all"
                                        title="사진 변경"
                                    >
                                        📷
                                    </button>
                                )}
                            </div>

                            {/* 미리보기 상태: 저장/취소 버튼 */}
                            {previewImage ? (
                                <div className="flex gap-2 w-full max-w-xs">
                                    <button
                                        onClick={handleUploadImage}
                                        disabled={isUploadingImage}
                                        className="flex-1 py-3 bg-[#FF8C69] text-white text-[11px] font-black rounded-xl hover:bg-[#ffaa33] transition-all disabled:opacity-50 uppercase tracking-widest shadow-lg shadow-[#FF8C69]/20 active:scale-95"
                                    >
                                        {isUploadingImage ? '업로드 중...' : '✓ 사진 저장'}
                                    </button>
                                    <button
                                        onClick={handleCancelImagePreview}
                                        disabled={isUploadingImage}
                                        className="flex-1 py-3 bg-white/5 text-[#6b6b8a] text-[11px] font-black rounded-xl hover:bg-white/10 transition-all border border-white/5 uppercase tracking-widest active:scale-95"
                                    >
                                        ✕ 취소
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-6 py-3 bg-white/5 text-[#aaaacc] text-[11px] font-black rounded-xl hover:bg-white/10 transition-all border border-white/5 uppercase tracking-widest active:scale-95"
                                >
                                    📷 사진 변경
                                </button>
                            )}

                            {/* 히든 파일 인풋 */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                className="hidden"
                            />
                        </div>
                    </section>
                )}

                {/* Sound Selection */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-[#FF8C69] uppercase tracking-[0.3em] mb-8 flex items-center gap-2 font-mono">
                        <span className="w-2 h-2 bg-[#FF8C69] rounded-full animate-pulse"></span> 오디오 인터페이스
                    </h3>
                    <div className="space-y-3">
                        {soundOptions.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => { setSoundType(option.id); playPreview(option.id); }}
                                className={`w-full p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${soundType === option.id
                                    ? 'bg-[#FF8C69]/10 border-[#FF8C69]/30 text-white'
                                    : 'bg-white/5 border-transparent text-[#6b6b8a] hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-xl group-hover:scale-125 transition-transform">{option.icon}</span>
                                    <span className="text-sm font-black">{option.label}</span>
                                </div>
                                {soundType === option.id && (
                                    <span className="text-[#FF8C69] text-xs">● ACTIVE</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Volume Control */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-[#FF8C69] uppercase tracking-[0.3em] mb-8 font-mono">마스터 볼륨 레벨</h3>
                    <div className="flex items-center gap-6">
                        <span className="text-xl">🔈</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="flex-1 accent-[#FF8C69] h-1.5 bg-[#1a1a24] rounded-full appearance-none cursor-pointer"
                        />
                        <span className="text-xl">🔊</span>
                    </div>
                    <div className="mt-4 flex justify-between text-[10px] font-black text-[#444466] uppercase tracking-[0.3em] font-mono">
                        <span>MIN</span>
                        <span className="text-[#FF8C69] text-lg">{Math.round(volume * 100)}%</span>
                        <span>MAX</span>
                    </div>
                    <button
                        onClick={() => playPreview()}
                        className="w-full mt-8 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black text-[#6b6b8a] hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest font-mono"
                    >
                        오디오 테스트 시작
                    </button>
                </section>

                {/* Notification Permission Section */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-[#FF8C69] uppercase tracking-[0.3em] mb-8 flex items-center gap-2 font-mono">
                        <span className="w-2 h-2 bg-[#FF8C69] rounded-full animate-bounce"></span> 리얼타임 푸시 알림 (PWA)
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                            <div>
                                <p className="text-sm font-black text-white mb-1 uppercase">네트워크 라이브 알림</p>
                                <p className="text-[10px] text-[#444466] uppercase tracking-wider font-mono font-bold">
                                    Status: {pushStatus === 'granted' ? '✅ SUBSCRIPTION ACTIVE' : pushStatus === 'denied' ? '❌ ACCESS DENIED' : '❓ NO PERMISSION'}
                                </p>
                            </div>
                            {pushStatus !== 'granted' && pushStatus !== 'denied' && (
                                <button
                                    disabled={isSubscribing}
                                    onClick={handleSubscribe}
                                    className="px-6 py-3 orange-gradient text-white text-[10px] font-black rounded-xl shadow-lg shadow-[#FF8C69]/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest disabled:opacity-50"
                                >
                                    {isSubscribing ? '구독 활성화 중...' : '알림 수신 허용'}
                                </button>
                            )}
                            {pushStatus === 'denied' && (
                                <p className="text-[10px] text-red-400 font-mono font-bold uppercase">시스템 설정에서 직접 허용 필요</p>
                            )}
                        </div>
                        <div className="p-5 rounded-2xl bg-[#FF8C69]/5 border border-[#FF8C69]/10">
                            <p className="text-[11px] text-[#FF8C69] font-black mb-2 uppercase tracking-widest">📱 iOS / iPhone 환경 구축 가이드</p>
                            <p className="text-[11px] text-[#6b6b8a] leading-relaxed font-medium">
                                Safari 하단의 <span className="text-white font-black italic">공유 아이콘</span>을 클릭한 후<br />
                                <span className="text-[#FF8C69] font-black"> [홈 화면에 추가]</span> 절차를 반드시 완료해 주세요.<br />
                                <span className="italic mt-1 block">생성된 홈 아이콘으로 접속해야 실시간 푸시 서비스가 가동됩니다.</span>
                            </p>
                        </div>
                    </div>
                </section>

                {/* Account Actions */}
                <section className="pt-8">
                    <button
                        onClick={logout}
                        className="w-full py-6 bg-red-500/10 text-red-500 border border-red-500/10 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] hover:bg-red-500 hover:text-white transition-all shadow-2xl hover:shadow-red-500/40 active:scale-95 font-mono"
                    >
                        🔐 세션 종료 및 시스템 로그아웃
                    </button>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
