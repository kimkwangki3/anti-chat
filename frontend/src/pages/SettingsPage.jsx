import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import useSettingsStore from '../store/settingsStore';

const SettingsPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();
    const { soundType, volume, setSoundType, setVolume, sounds } = useSettingsStore();

    const playPreview = (type) => {
        const audio = new Audio(sounds[type || soundType]);
        audio.volume = volume;
        audio.play().catch(e => console.log('Preview blocked:', e));
    };

    const soundOptions = [
        { id: 'orange', label: '오렌지 팝 (기본)', icon: '🍑' },
        { id: 'crystal', label: '크리스탈 딩', icon: '💎' },
        { id: 'knock', label: '깔끔한 노크', icon: '🚪' },
    ];

    return (
        <div className="h-full bg-[#1a1a24] p-6 md:p-12 overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="max-w-2xl mx-auto mb-12 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-widest uppercase italic font-mono mb-2">Settings</h1>
                    <p className="text-[10px] font-bold text-[#6b6b8a] uppercase tracking-[0.4em]">Personalize your connection</p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-all"
                >
                    ✕
                </button>
            </div>

            <div className="max-w-2xl mx-auto space-y-8">
                {/* Profile Section */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-3xl orange-gradient flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-[#FF9500]/20">
                            {user?.name?.[0]}
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">{user?.name}</h2>
                            <p className="text-xs text-[#6b6b8a] font-mono tracking-widest uppercase">{user?.role} / {user?.username}</p>
                        </div>
                    </div>
                </section>

                {/* Sound Selection */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-[#FF9500] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#FF9500] rounded-full animate-pulse"></span> Notification Sound
                    </h3>

                    <div className="space-y-3">
                        {soundOptions.map((option) => (
                            <div
                                key={option.id}
                                onClick={() => { setSoundType(option.id); playPreview(option.id); }}
                                className={`w-full p-5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group ${soundType === option.id
                                    ? 'bg-[#FF9500]/10 border-[#FF9500]/30 text-white'
                                    : 'bg-white/5 border-transparent text-[#6b6b8a] hover:bg-white/10'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className="text-xl group-hover:scale-125 transition-transform">{option.icon}</span>
                                    <span className="text-sm font-bold">{option.label}</span>
                                </div>
                                {soundType === option.id && (
                                    <span className="text-[#FF9500] text-xs">●</span>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* Volume Control */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-[#FF9500] uppercase tracking-[0.3em] mb-8">Sound Volume</h3>
                    <div className="flex items-center gap-6">
                        <span className="text-xl">🔈</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={volume}
                            onChange={(e) => setVolume(parseFloat(e.target.value))}
                            className="flex-1 accent-[#FF9500] h-1.5 bg-[#1a1a24] rounded-full appearance-none cursor-pointer"
                        />
                        <span className="text-xl">🔊</span>
                    </div>
                    <div className="mt-4 flex justify-between text-[10px] font-bold text-[#444466] uppercase tracking-widest">
                        <span>Min</span>
                        <span className="text-[#FF9500]">{Math.round(volume * 100)}%</span>
                        <span>Max</span>
                    </div>
                    <button
                        onClick={() => playPreview()}
                        className="w-full mt-8 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black text-[#6b6b8a] hover:text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                    >
                        테스트 재생하기
                    </button>
                </section>

                {/* Notification Permission Section */}
                <section className="bg-[#23232f] rounded-[2.5rem] p-8 border border-white/5 shadow-2xl">
                    <h3 className="text-xs font-black text-[#FF9500] uppercase tracking-[0.3em] mb-8 flex items-center gap-2">
                        <span className="w-2 h-2 bg-[#FF9500] rounded-full animate-bounce"></span> Push Notifications
                    </h3>
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5">
                            <div>
                                <p className="text-sm font-bold text-white mb-1">브라우저 알림 권한</p>
                                <p className="text-[10px] text-[#6b6b8a] uppercase tracking-wider font-mono">
                                    현재 상태: {Notification.permission === 'granted' ? '✅ 허용됨' : Notification.permission === 'denied' ? '❌ 거부됨' : '❓ 확인 필요'}
                                </p>
                            </div>
                            {Notification.permission !== 'granted' && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const permission = await Notification.requestPermission();
                                            if (permission === 'granted') {
                                                const registration = await navigator.serviceWorker.ready;
                                                const response = await fetch('/api/push/vapid-key');
                                                const { publicKey } = await response.json();

                                                const subscription = await registration.pushManager.subscribe({
                                                    userVisibleOnly: true,
                                                    applicationServerKey: publicKey
                                                });

                                                const saveRes = await fetch('/api/push/subscribe', {
                                                    method: 'POST',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${localStorage.getItem('anti-auth-token')}`
                                                    },
                                                    body: JSON.stringify({ subscription })
                                                });

                                                if (saveRes.ok) {
                                                    alert('상큼하게 알림 구독이 완료되었습니다! 🍑');
                                                    window.location.reload();
                                                }
                                            } else {
                                                alert('알림을 허용해주셔야 채팅 소식을 실시간으로 받을 수 있어요. 🔔');
                                            }
                                        } catch (err) {
                                            console.error('Push subscription failed:', err);
                                            alert('알림 구독 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
                                        }
                                    }}
                                    className="px-6 py-3 orange-gradient text-white text-[10px] font-black rounded-xl shadow-lg shadow-[#FF9500]/20 hover:scale-105 active:scale-95 transition-all uppercase tracking-widest"
                                >
                                    알림 허용하기
                                </button>
                            )}
                        </div>
                        <p className="text-[11px] text-[#444466] leading-relaxed italic">
                            💡 **아이폰 사용 시**: 반드시 하단 '공유' 버튼을 눌러 **[홈 화면에 추가]**를 먼저 진행한 후, 홈 화면의 아이콘으로 접속해야 알림을 받을 수 있습니다.
                        </p>
                    </div>
                </section>

                {/* Account Actions */}
                <section className="pt-8">
                    <button
                        onClick={logout}
                        className="w-full py-6 bg-red-500/5 text-red-500 border border-red-500/10 rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] hover:bg-red-500 hover:text-white transition-all shadow-xl hover:shadow-red-500/20 active:scale-95"
                    >
                        👋 Sign Out Account
                    </button>
                </section>
            </div>
        </div>
    );
};

export default SettingsPage;
