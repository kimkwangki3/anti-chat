import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../api/axios';

// 공개 안내 페이지 (누구나 접근). 예: vgmd.kr/guide
// 모바일 MTS 신규 개발로 인한 프로그램 설치 안내 + 로그인 버튼.
const GuidePage = () => {
    const navigate = useNavigate();
    const [ch, setCh] = useState(null);

    useEffect(() => {
        // 접속한 도메인(host)으로 채널 브랜딩 조회 (없으면 기본 표시)
        axios.get('/channels/login-info', { params: { host: window.location.hostname } })
            .then(({ data }) => setCh(data))
            .catch(() => { });
    }, []);

    const theme = ch?.cardColor || '#FF8C69';
    const logo = ch?.loginLogo || ch?.profileImage;
    const name = ch?.name || '금메달';

    return (
        <div
            className="min-h-screen min-h-[100dvh] w-full flex items-center justify-center bg-[#1a1a24] text-white px-5 py-10"
            style={{ backgroundImage: `radial-gradient(circle at top, ${theme}20, transparent 60%)` }}
        >
            <div className="w-full max-w-md">
                {/* 로고 / 채널명 */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 rounded-3xl overflow-hidden bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl mb-4">
                        {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : <span className="text-4xl">🥇</span>}
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">{name}</h1>
                </div>

                {/* 안내 카드 */}
                <div className="p-7 rounded-3xl bg-[#22222e] border border-white/10 shadow-2xl">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-lg">📢</span>
                        <h2 className="text-base font-bold" style={{ color: theme }}>프로그램 설치 안내</h2>
                    </div>

                    <div className="space-y-4 text-sm leading-relaxed text-[#d1d1e0]">
                        <p>
                            안녕하세요. 모바일 MTS 개선으로 <b className="text-white">새로운 전용 프로그램 설치</b>가 필요합니다.
                            아래 안내에 따라 설치를 부탁드립니다. 🙏
                        </p>

                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                            <p className="font-bold text-white mb-2.5">📌 설치 방법</p>
                            <ol className="list-decimal list-inside space-y-2 text-[13px] marker:font-bold">
                                <li>아래 <b style={{ color: theme }}>[{name} 로그인]</b> 버튼으로 로그인</li>
                                <li>로그인 후 <b className="text-white">게시판</b> 메뉴로 이동</li>
                                <li>게시판에 올라온 <b className="text-white">설치 프로그램</b>을 다운로드</li>
                                <li>다운로드한 프로그램을 설치 후 이용해 주세요</li>
                            </ol>
                        </div>

                        <div className="p-4 rounded-2xl border" style={{ backgroundColor: `${theme}12`, borderColor: `${theme}33` }}>
                            <p className="text-[13px]">
                                <span className="mr-1">🔑</span>
                                로그인 <b className="text-white">아이디 · 비밀번호</b>는 <b style={{ color: theme }}>기존 HTS 아이디 · 비밀번호와 동일</b>합니다.
                            </p>
                        </div>

                        <p className="text-[12px] text-[#9a9ab0]">
                            ※ 설치나 이용 관련 문의는 로그인 후 <b className="text-[#c0c0d0]">관리자 채팅</b>으로 문의해 주세요.
                        </p>
                    </div>

                    <button
                        onClick={() => navigate('/login')}
                        className="w-full mt-7 py-4 rounded-2xl font-bold text-white text-sm active:scale-[0.98] transition-transform"
                        style={{ backgroundColor: theme, boxShadow: `0 12px 28px ${theme}45` }}
                    >
                        {name} 로그인 →
                    </button>
                </div>

                <p className="text-center text-[11px] text-[#5a5a6a] mt-6 tracking-wide">© {name}</p>
            </div>
        </div>
    );
};

export default GuidePage;
