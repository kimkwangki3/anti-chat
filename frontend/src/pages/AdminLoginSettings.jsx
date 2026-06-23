import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from '../api/axios';
import useAuthStore from '../store/authStore';

const AdminLoginSettings = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const channelId = new URLSearchParams(location.search).get('channelId');

    const [channel, setChannel] = useState(null);
    const [loginTitle, setLoginTitle] = useState('');
    const [loginDomain, setLoginDomain] = useState('');
    const [cardColor, setCardColor] = useState('#FF8C69');
    const [loginLogo, setLoginLogo] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [msg, setMsg] = useState('');
    const fileRef = useRef(null);

    const { user } = useAuthStore();
    const isSuperAdmin = user?.role === 'superadmin';
    const [linkedServer, setLinkedServer] = useState('');
    const [linkedDb, setLinkedDb] = useState('');
    const [savingConn, setSavingConn] = useState(false);

    const handleSaveConn = async () => {
        setSavingConn(true); setMsg('');
        try {
            const { data } = await axios.put(`/superadmin/channels/${channelId}/sync-settings`, { linkedServer, linkedDb });
            setMsg(data.message || '연결 설정이 저장되었습니다.');
        } catch (e) {
            setMsg(e.response?.data?.message || '연결 설정 저장에 실패했습니다.');
        } finally {
            setSavingConn(false);
        }
    };

    const handleSync = async () => {
        setSyncing(true); setMsg('');
        try {
            const { data } = await axios.post(`/channels/${channelId}/sync`);
            setMsg(data.message || '동기화 완료');
        } catch (e) {
            setMsg(e.response?.data?.message || '동기화에 실패했습니다.');
        } finally {
            setSyncing(false);
        }
    };

    useEffect(() => {
        if (!channelId) return;
        axios.get(`/channels/${channelId}`)
            .then(({ data }) => {
                setChannel(data);
                setLoginTitle(data.loginTitle || '');
                setLoginDomain(data.loginDomain || '');
                setCardColor(data.cardColor || '#FF8C69');
                setLoginLogo(data.loginLogo || data.profileImage || '');
                setLinkedServer(data.linkedServer || '');
                setLinkedDb(data.linkedDb || '');
            })
            .catch(() => setMsg('채널 정보를 불러오지 못했습니다.'));
    }, [channelId]);

    const handleSave = async () => {
        setSaving(true); setMsg('');
        try {
            await axios.put(`/channels/${channelId}/login-settings`, { loginTitle, loginDomain, cardColor });
            setMsg('저장되었습니다.');
        } catch (e) {
            setMsg(e.response?.data?.message || '저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true); setMsg('');
        const fd = new FormData();
        fd.append('logo', file);
        try {
            const { data } = await axios.post(`/channels/${channelId}/login-logo`, fd);
            setLoginLogo(data.loginLogo);
            setMsg('아이콘이 업로드되었습니다.');
        } catch (err) {
            setMsg(err.response?.data?.message || '업로드에 실패했습니다.');
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = '';
        }
    };

    if (!channelId) {
        return <div className="p-10 text-center text-gray-500">채널이 지정되지 않았습니다.</div>;
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const pathUrl = channel?.slug ? `${origin}/c/${channel.slug}` : '';
    const domainUrl = loginDomain ? `https://${loginDomain}` : '';

    return (
        <div className="page-container p-6 md:p-10 pb-24 md:pb-10 pt-safe max-w-2xl">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">로그인 페이지 설정</h1>
                    <p className="text-sm text-gray-500 mt-1">{channel?.name || ''} 채널 전용 로그인 화면을 꾸밉니다.</p>
                </div>
                <button onClick={() => navigate(-1)} className="w-10 h-10 glass-card !p-0 flex items-center justify-center text-white hover:bg-white/10">✕</button>
            </header>

            {msg && <div className="mb-5 p-3 rounded-xl bg-[#FF8C69]/10 border border-[#FF8C69]/20 text-[#FF8C69] text-sm">{msg}</div>}

            <div className="space-y-6">
                {/* 회원 DB 동기화 */}
                <section className="glass-card p-6 border-[#FF8C69]/20">
                    <h3 className="text-sm font-bold text-gray-300 mb-2">회원 DB 동기화</h3>
                    <p className="text-[11px] text-gray-600 mb-4">외부(GTRADE) 회원 정보를 이 채널로 가져옵니다. (USER_GRADE 2·3 회원, 기존 회원은 갱신·신규는 추가)</p>
                    <button onClick={handleSync} disabled={syncing} className="peach-button px-5 py-2.5 text-sm disabled:opacity-50">
                        {syncing ? '동기화 중...' : '지금 동기화'}
                    </button>
                </section>

                {/* 외부 DB 연결 설정 (슈퍼어드민 전용) */}
                {isSuperAdmin && (
                    <section className="glass-card p-6 border-purple-500/20">
                        <h3 className="text-sm font-bold text-gray-300 mb-2">외부 DB 연결 (GTRADE) <span className="text-[10px] text-purple-400">최고관리자 전용</span></h3>
                        <p className="text-[11px] text-gray-600 mb-4">이 채널이 회원을 가져올 외부 서버/DB. 서버 주소가 바뀌면 여기서 수정하세요. (단, MSSQL에 링크드서버 등록은 SSMS에서 별도로 해야 함)</p>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">연결 서버 (linkedServer)</label>
                                <input
                                    value={linkedServer}
                                    onChange={(e) => setLinkedServer(e.target.value)}
                                    placeholder="예: 110.4.89.210,4600"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">연결 DB (linkedDb)</label>
                                <input
                                    value={linkedDb}
                                    onChange={(e) => setLinkedDb(e.target.value)}
                                    placeholder="예: GTRADENEW"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-purple-500/50"
                                />
                            </div>
                            <button onClick={handleSaveConn} disabled={savingConn} className="px-5 py-2.5 text-sm font-bold rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30 hover:bg-purple-500 hover:text-white transition-colors disabled:opacity-50">
                                {savingConn ? '저장 중...' : '연결 설정 저장'}
                            </button>
                        </div>
                    </section>
                )}

                {/* 아이콘 */}
                <section className="glass-card p-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-4">아이콘 / 로고</h3>
                    <div className="flex items-center gap-5">
                        <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
                            {loginLogo ? <img src={loginLogo} alt="" className="w-full h-full object-cover" /> : <span className="text-3xl">🍑</span>}
                        </div>
                        <div>
                            <button onClick={() => fileRef.current?.click()} disabled={uploading} className="peach-button px-5 py-2.5 text-sm disabled:opacity-50">
                                {uploading ? '업로드 중...' : '이미지 업로드'}
                            </button>
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                            <p className="text-[11px] text-gray-600 mt-2">정사각형 이미지를 권장합니다.</p>
                        </div>
                    </div>
                </section>

                {/* 제목/문구 */}
                <section className="glass-card p-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-4">제목 / 환영 문구</h3>
                    <input
                        value={loginTitle}
                        onChange={(e) => setLoginTitle(e.target.value)}
                        maxLength={100}
                        placeholder={channel?.name ? `예: ${channel.name}에 오신 것을 환영합니다` : '로그인 화면 제목'}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF8C69]/50"
                    />
                </section>

                {/* 테마 색상 */}
                <section className="glass-card p-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-4">테마 색상</h3>
                    <div className="flex items-center gap-4">
                        <input type="color" value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="w-12 h-12 rounded-lg bg-transparent cursor-pointer border border-white/10" />
                        <input value={cardColor} onChange={(e) => setCardColor(e.target.value)} className="w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm font-mono" />
                        <div className="px-4 py-2 rounded-lg text-white text-sm font-bold" style={{ backgroundColor: cardColor }}>미리보기</div>
                    </div>
                </section>

                {/* 연결 도메인 */}
                <section className="glass-card p-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-4">연결 도메인 (선택)</h3>
                    <input
                        value={loginDomain}
                        onChange={(e) => setLoginDomain(e.target.value)}
                        placeholder="예: golf.example.com (도메인 연결 후 입력)"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:outline-none focus:border-[#FF8C69]/50"
                    />
                    <p className="text-[11px] text-gray-600 mt-2">이 도메인으로 접속하면 이 채널 로그인 화면이 자동으로 표시됩니다. (DNS를 사이트로 연결해야 작동)</p>
                </section>

                {/* 로그인 주소 안내 */}
                <section className="glass-card p-6">
                    <h3 className="text-sm font-bold text-gray-300 mb-3">회원 로그인 주소</h3>
                    {pathUrl && <p className="text-xs text-[#FF8C69] font-mono break-all mb-1">{pathUrl}</p>}
                    {domainUrl && <p className="text-xs text-[#FF8C69] font-mono break-all">{domainUrl}</p>}
                    <p className="text-[11px] text-gray-600 mt-2">이 주소를 채널 회원에게 공유하세요. 회원은 여기서만 로그인할 수 있습니다.</p>
                </section>

                <button onClick={handleSave} disabled={saving} className="w-full peach-button py-4 text-sm disabled:opacity-50">
                    {saving ? '저장 중...' : '설정 저장'}
                </button>
            </div>
        </div>
    );
};

export default AdminLoginSettings;
