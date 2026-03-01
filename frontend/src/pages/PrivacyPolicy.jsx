import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#09090b] text-[#a1a1aa] font-sans p-6 md:p-12 relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#FF8C69]/5 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#E8735A]/3 rounded-full blur-[120px]"></div>

            <div className="max-w-4xl mx-auto relative z-10 animate-slide-up">
                {/* Header */}
                <header className="flex items-center justify-between mb-12">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl shadow-lg border border-[#FF8C69]/20 group-hover:scale-105 transition-transform">
                            <span>🍑</span>
                        </div>
                        <div>
                            <h1 className="text-sm font-bold text-white tracking-widest font-mono uppercase leading-none">PEACH</h1>
                            <span className="text-[9px] font-semibold text-[#FF8C69]/70 uppercase tracking-widest">Privacy Engine</span>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(-1)}
                        className="px-6 py-2 glass-card border-white/10 rounded-xl text-xs font-bold text-white hover:bg-white/10 transition-all uppercase tracking-widest"
                    >
                        Close
                    </button>
                </header>

                {/* Content Card */}
                <main className="glass-card p-8 md:p-12 shadow-2xl backdrop-blur-3xl !bg-white/[0.02]">
                    <div className="prose prose-invert max-w-none">
                        <section className="mb-10">
                            <h2 className="text-3xl font-black text-white mb-6 italic border-l-4 border-[#FF8C69] pl-6 uppercase tracking-tight">개인정보 보호정책</h2>
                            <p className="leading-relaxed text-sm">
                                이 개인정보 보호정책은 (이하 "서비스 제공자")가 무료 서비스로 개발한 모바일 기기용 Peach Chat 앱(이하 "애플리케이션")에 적용됩니다. 이 서비스는 "있는 그대로" 제공됩니다.
                            </p>
                        </section>

                        <div className="space-y-10 text-sm md:text-base leading-relaxed text-slate-500">
                            <article>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-[#FF8C69] rounded-full"></span>
                                    정보 수집 및 이용
                                </h3>
                                <p className="mb-4 text-sm font-medium">이 애플리케이션은 사용자가 다운로드하고 사용할 때 정보를 수집합니다. 이 정보에는 다음과 같은 내용이 포함될 수 있습니다.</p>
                                <ul className="list-disc pl-6 space-y-2 marker:text-[#FF8C69] text-sm">
                                    <li>기기의 인터넷 프로토콜 주소(예: IP 주소)</li>
                                    <li>사용자가 애플리케이션에서 방문한 페이지, 방문 시간 및 날짜, 해당 페이지에서 보낸 시간</li>
                                    <li>지원서 작성에 소요된 시간</li>
                                    <li>모바일 기기에서 사용하는 운영 체제</li>
                                </ul>
                                <p className="mt-4 italic text-xs">본 애플리케이션은 인공지능(AI) 기술을 사용하여 사용자의 데이터를 처리하거나 기능을 제공하지 않습니다.</p>
                            </article>

                            <article>
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 text-left">
                                    <span className="w-1.5 h-6 bg-[#FF8C69] rounded-full"></span>
                                    제3자 접근
                                </h3>
                                <p className="text-sm">
                                    집계되고 익명화된 데이터만 주기적으로 외부 서비스로 전송되어 서비스 제공업체가 애플리케이션 및 서비스를 개선하는 데 도움을 줍니다. 서비스 제공업체는 본 개인정보 처리방침에 설명된 방식으로 귀하의 정보를 제3자와 공유할 수 있습니다.
                                </p>
                                <div className="mt-4 p-5 glass-card !bg-white/[0.01] border-white/5">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-widest opacity-60 text-slate-400">Compliance</p>
                                    <a href="https://www.google.com/policies/privacy/" target="_blank" rel="noopener noreferrer" className="text-[#FF8C69] font-bold underline decoration-2 underline-offset-4 text-xs">구글 플레이 서비스</a>
                                </div>
                            </article>

                            <article className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="p-6 glass-card border-white/5 !bg-white/[0.01]">
                                    <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-[10px] opacity-70">데이터 보존 정책</h4>
                                    <p className="text-[11px] leading-relaxed font-medium">서비스 제공자는 사용자가 애플리케이션을 사용하는 동안 그리고 그 후 합리적인 기간 동안 사용자가 제공한 데이터를 보관합니다. 삭제 요청: rlaehdgo0301@gmail.com</p>
                                </div>
                                <div className="p-6 glass-card border-white/5 !bg-white/[0.01] text-left">
                                    <h4 className="text-white font-bold mb-3 uppercase tracking-widest text-[10px] opacity-70">어린이 보호</h4>
                                    <p className="text-[11px] leading-relaxed font-medium">본 애플리케이션은 만 13세 미만 아동을 대상으로 하지 않습니다. 만약 아동이 정보를 제공한 사실을 알게 될 경우 즉시 서버에서 삭제합니다.</p>
                                </div>
                            </article>

                            <article className="pt-8 border-t border-white/5">
                                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="w-1.5 h-6 bg-[#FF8C69] rounded-full"></span>
                                    보안 및 변경
                                </h3>
                                <p className="mb-6 text-sm">서비스 제공업체는 고객 정보의 기밀 유지를 중요하게 생각합니다. 물리적, 전자적, 절차적 안전장치를 통해 정보를 보호합니다.</p>
                                <div className="bg-[#FF8C69]/5 p-6 rounded-3xl border border-[#FF8C69]/10">
                                    <p className="text-xs text-white font-black mb-2 uppercase tracking-widest">Contact Us</p>
                                    <p className="text-[11px]">이메일: <a href="mailto:rlaehdgo0301@gmail.com" className="text-[#FF8C69] underline">rlaehdgo0301@gmail.com</a></p>
                                    <p className="text-[10px] mt-4 opacity-40 uppercase tracking-[0.2em] font-mono">ENACTED: FEB 22, 2026</p>
                                </div>
                            </article>
                        </div>
                    </div>
                </main>

                <footer className="mt-12 text-center pb-20">
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.5em] font-mono">PEACH CONNECT (C) 2026 ENGINE PROTOCOL</p>
                </footer>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
