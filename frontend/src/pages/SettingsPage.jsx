import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';
import axios from '../api/axios';
import useChannelStore from '../store/channelStore';

const SettingsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, uploadProfileImage, updateProfile } = useAuthStore();
    const { myChannels } = useChannelStore();
    const { soundType, volume, setSoundType, setVolume, sounds } = useSettingsStore();

    const ownedChannelId = myChannels.find(m =>
        (m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id)
    )?.channelId?._id;
    const ownedChannelIds = myChannels
        .filter(m => (m.channelId?.ownerId?._id === user?._id || m.channelId?.ownerId === user?._id))
        .map(m => m.channelId?._id)
        .filter(Boolean);
    const query = new URLSearchParams(location.search);
    const contextChannelId = query.get('channelId');
    const isChannelSettingsMode = Boolean(
        contextChannelId &&
        (user?.role === 'admin' || user?.role === 'superadmin') &&
        ownedChannelIds.includes(contextChannelId)
    );

    const [pushStatus, setPushStatus] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
    const [isSubscribing, setIsSubscribing] = useState(false);

    const fileInputRef = useRef(null);
    const [previewImage, setPreviewImage] = useState(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [profileName, setProfileName] = useState(user?.name || '');
    const [profileNickname, setProfileNickname] = useState(user?.nickname || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const canEditProfileNames = user?.role === 'admin' || user?.role === 'superadmin';

    useEffect(() => {
        setProfileName(user?.name || '');
        setProfileNickname(user?.nickname || '');
    }, [user?.name, user?.nickname]);

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
            alert(result.message ? `이미지 업로드에 실패했습니다.\n${result.message}` : '이미지 업로드에 실패했습니다.');
        }
        setIsUploadingImage(false);
    };

    const handleCancelImagePreview = () => {
        setPreviewImage(null);
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSaveProfile = async () => {
        if (!canEditProfileNames) {
            alert('일반회원은 아바타만 변경할 수 있습니다.');
            return;
        }

        if (!profileName.trim()) {
            alert('이름을 입력해주세요.');
            return;
        }

        setIsSavingProfile(true);
        const ok = await updateProfile(profileName, profileNickname);
        setIsSavingProfile(false);

        if (ok) {
            alert('이름 설정이 저장되었습니다.');
        } else {
            alert('이름 설정 저장에 실패했습니다.');
        }
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
        <div className="page-container p-6 md:p-10 pb-24 md:pb-10 pt-safe">
            {/* Header */}
            <header className="flex justify-between items-end mb-12 animate-slide-up">
                <div>
                    <div className="flex items-center gap-3 mb-3">
                        <span className="w-2 h-2 bg-[#FF8C69] rounded-full shadow-[0_0_10px_#FF8C69]"></span>
                        <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">System Preferences</h2>
                    </div>
                    <h1 className="text-3xl font-black text-white/95 tracking-tight">환경 설정 ⚙️</h1>
                    <p className="text-slate-500 text-[11px] font-bold tracking-widest uppercase ml-1 opacity-60">Custom connection & security engine</p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 glass-card !p-0 flex items-center justify-center text-white hover:bg-white/10 transition-all font-bold"
                >
                    ✕
                </button>
            </header>

            <div className="max-w-3xl space-y-8 pb-32 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                {/* Admin Quick Access */}
                {(user?.role === 'admin' || user?.role === 'superadmin') && (contextChannelId || ownedChannelId) && !isChannelSettingsMode && (
                    <section className="glass-card p-8 bg-gradient-to-br from-[#FF8C69]/10 to-transparent border-[#FF8C69]/20 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform">
                            <span className="text-8xl font-black italic uppercase font-mono leading-none text-[#FF8C69]">ADMIN</span>
                        </div>
                        <h3 className="text-[10px] font-black text-[#FF8C69] uppercase tracking-[0.4em] mb-6 flex items-center gap-2 font-mono">
                            👑 채널 마스터 엔진
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
                            <button
                                onClick={() => navigate(`/admin/members?channelId=${contextChannelId || ownedChannelId}`)}
                                className="peach-button py-4 text-xs tracking-widest"
                            >
                                👥 멤버 매니지먼트
                            </button>
                            <button
                                onClick={() => navigate(`/admin/edit-channel?channelId=${contextChannelId || ownedChannelId}`)}
                                className="glass-card py-4 text-xs font-black text-[#FF8C69] border-[#FF8C69]/20 uppercase tracking-widest hover:bg-[#FF8C69]/5"
                            >
                                ⚙️ 코어 시스템 구성
                            </button>
                        </div>
                    </section>
                )}

                <div className="bento-grid !p-0 gap-8">
                    {/* Profile Section */}
                    {user && !isChannelSettingsMode && (
                        <section className="glass-card p-8 md:col-span-2 relative overflow-hidden">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 font-mono">신원 인증 데이터</h3>
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="relative">
                                    <div className="w-32 h-32 rounded-3xl overflow-hidden glass-card !p-0 border-2 border-white/5 shadow-2xl">
                                        {displayImage ? (
                                            <img src={displayImage} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-4xl bg-white/5">👤</div>
                                        )}
                                    </div>
                                    {!previewImage && (
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="absolute -bottom-2 -right-2 w-10 h-10 bg-[#FF8C69] rounded-2xl flex items-center justify-center text-white text-lg shadow-lg hover:scale-110 transition-transform"
                                        >
                                            📷
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4 w-full">
                                    <div>
                                        <p className="text-sm font-black text-white">{user?.name}</p>
                                        <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-1">
                                            {user?.role === 'admin' ? 'Operator' : 'Standard Member'}
                                        </p>
                                    </div>
                                    {previewImage ? (
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleUploadImage}
                                                disabled={isUploadingImage}
                                                className="px-6 py-3 bg-[#FF8C69] text-white text-[10px] font-black rounded-xl hover:bg-[#E8735A] transition-all disabled:opacity-50 uppercase tracking-widest"
                                            >
                                                {isUploadingImage ? 'SYNCING...' : 'CONFIRM SYNC'}
                                            </button>
                                            <button
                                                onClick={handleCancelImagePreview}
                                                disabled={isUploadingImage}
                                                className="px-6 py-3 glass-card !p-3 text-slate-500 text-[10px] font-black rounded-xl hover:text-white uppercase tracking-widest"
                                            >
                                                CANCEL
                                            </button>
                                        </div>
                                    ) : (
                                        <p className="text-[10px] text-slate-600 font-medium">네트워크에 표시될 신원 데이터를 업데이트 하세요.</p>
                                    )}
                                    <div className="pt-2 space-y-3">
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                Display Name
                                            </label>
                                            <input
                                                value={profileName}
                                                onChange={(e) => setProfileName(e.target.value)}
                                                maxLength={20}
                                                disabled={!canEditProfileNames}
                                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF8C69]/40"
                                                placeholder="관리자 이름"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">
                                                Nickname
                                            </label>
                                            <input
                                                value={profileNickname}
                                                onChange={(e) => setProfileNickname(e.target.value)}
                                                maxLength={20}
                                                disabled={!canEditProfileNames}
                                                className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-sm text-white focus:outline-none focus:border-[#FF8C69]/40"
                                                placeholder="닉네임"
                                            />
                                        </div>
                                        {canEditProfileNames ? (
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={isSavingProfile}
                                                className="px-6 py-3 bg-[#FF8C69] text-white text-[10px] font-black rounded-xl hover:bg-[#E8735A] transition-all disabled:opacity-50 uppercase tracking-widest"
                                            >
                                                {isSavingProfile ? 'SAVING...' : '이름 저장'}
                                            </button>
                                        ) : (
                                            <p className="text-[10px] text-slate-500 font-semibold">
                                                일반회원은 아바타 사진만 변경할 수 있습니다.
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                        </section>
                    )}

                    {isChannelSettingsMode && (
                        <section className="glass-card p-8 md:col-span-2 relative overflow-hidden">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6 font-mono">
                                CHANNEL SETTINGS
                            </h3>
                            <p className="text-sm text-slate-400 mb-6">
                                채널 내부 설정 화면입니다. 채널 정보 변경과 멤버 관리는 아래 메뉴에서 진행하세요.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <button
                                    onClick={() => navigate(`/admin/edit-channel?channelId=${contextChannelId}`)}
                                    className="peach-button py-4 text-xs tracking-widest"
                                >
                                    채널 정보 수정
                                </button>
                                <button
                                    onClick={() => navigate(`/admin/members?channelId=${contextChannelId}`)}
                                    className="glass-card py-4 text-xs font-black text-[#FF8C69] border-[#FF8C69]/20 uppercase tracking-widest hover:bg-[#FF8C69]/5"
                                >
                                    멤버 관리
                                </button>
                            </div>
                            <div className="mt-5">
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                >
                                    메인 설정으로 이동
                                </button>
                            </div>
                        </section>
                    )}

                    {!isChannelSettingsMode && (
                        <>
                    {/* Sound Selection */}
                    <section className="glass-card p-8">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 font-mono">오디오 인터페이스</h3>
                        <div className="space-y-4">
                            {soundOptions.map((option) => (
                                <div
                                    key={option.id}
                                    onClick={() => { setSoundType(option.id); playPreview(option.id); }}
                                    className={`w-full p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${soundType === option.id
                                        ? 'bg-[#FF8C69]/10 border-[#FF8C69]/20 text-white'
                                        : 'bg-white/5 border-transparent text-slate-600 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl group-hover:scale-110 transition-transform">{option.icon}</span>
                                        <span className="text-[11px] font-bold uppercase tracking-widest">{option.label}</span>
                                    </div>
                                    {soundType === option.id && <div className="w-1.5 h-1.5 bg-[#FF8C69] rounded-full shadow-[0_0_8px_#FF8C69]"></div>}
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Master Volume */}
                    <section className="glass-card p-8">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 font-mono">마스터 게인 제어</h3>
                        <div className="flex items-center gap-4 mb-4">
                            <span className="text-xl opacity-40">🔈</span>
                            <input
                                type="range" min="0" max="1" step="0.1" value={volume}
                                onChange={(e) => setVolume(parseFloat(e.target.value))}
                                className="flex-1 accent-[#FF8C69] h-1 bg-white/5 rounded-full appearance-none cursor-pointer"
                            />
                            <span className="text-xl opacity-40">🔊</span>
                        </div>
                        <div className="flex justify-between items-end">
                            <span className="text-[9px] font-black text-slate-700 uppercase tracking-[0.2em]">Output Level</span>
                            <span className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF8C69] to-white">{Math.round(volume * 100)}%</span>
                        </div>
                        <button
                            onClick={() => playPreview()}
                            className="w-full mt-8 py-3 glass-card !p-3 border-white/5 text-[9px] font-black text-slate-500 hover:text-[#FF8C69] transition-all uppercase tracking-[0.3em] font-mono"
                        >
                            SIGNAL TEST
                        </button>
                    </section>

                    {/* Push Notifications */}
                    <section className="glass-card p-8 md:col-span-2">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-8 font-mono">리얼타임 동기화 프로토콜</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="md:col-span-2 space-y-6">
                                <div className="flex items-center justify-between p-6 glass-card border-white/5 bg-white/[0.01]">
                                    <div>
                                        <p className="text-xs font-black text-white mb-2 uppercase tracking-wide">네트워크 라이브 푸시</p>
                                        <p className="text-[9px] text-slate-600 uppercase tracking-widest font-mono font-bold">
                                            Status: {pushStatus === 'granted' ? '✅ ACTIVE' : '❓ WAITING'}
                                        </p>
                                    </div>
                                    {pushStatus !== 'granted' && pushStatus !== 'denied' && (
                                        <button
                                            disabled={isSubscribing}
                                            onClick={handleSubscribe}
                                            className="px-6 py-3 peach-button text-[10px]"
                                        >
                                            {isSubscribing ? 'LINKING...' : 'ACTIVATE'}
                                        </button>
                                    )}
                                </div>
                                <div className="p-6 glass-card border-[#FF8C69]/10 bg-[#FF8C69]/[0.02]">
                                    <p className="text-[10px] font-black text-[#FF8C69] mb-3 uppercase tracking-[0.2em]">📱 iOS / iPhone 환경 동기화 안내</p>
                                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                        Safari 하단의 공유 아이콘 클릭 후 <span className="text-white font-bold">[홈 화면에 추가]</span> 절차를 완료하십시오.
                                        생성된 앱 아이콘으로 접속해야 백그라운드 푸시 서비스가 가동됩니다.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-center p-8 bg-white/[0.02] rounded-3xl border border-white/5 border-dashed">
                                <div className="text-center">
                                    <div className="text-4xl mb-4 opacity-20">🔔</div>
                                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-widest leading-loose">Real-time<br />Connection<br />Hub</p>
                                </div>
                            </div>
                        </div>
                    </section>
                        </>
                    )}
                </div>

                {/* Account Actions */}
                <section className="pt-12">
                    <button
                        onClick={logout}
                        className="w-full py-6 glass-card !p-0 border-red-500/10 text-red-500/60 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all font-mono text-[10px] font-black uppercase tracking-[0.5em] shadow-xl hover:shadow-red-500/20 active:scale-[0.98]"
                    >
                        🔐 TERMINATE CURRENT SESSION
                    </button>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
