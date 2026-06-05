import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ── Scroll Reveal ─────────────────────────────────────────────────────────
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, isVisible };
}

// ── Typewriter ────────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 52, startDelay = 500) {
  const [displayed, setDisplayed] = useState('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const delay = setTimeout(() => {
      let i = 0;
      interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(delay);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return displayed;
}

// ── Navbar ────────────────────────────────────────────────────────────────
const NAV_LINKS = [
  { label: '기능 소개', target: 'features' },
  { label: '에디터 데모', target: 'editor' },
  { label: '사용 방법', target: 'how-it-works' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: 'rgba(255,255,255,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: scrolled ? '1px solid rgba(0,0,0,0.07)' : '1px solid transparent',
        boxShadow: scrolled ? '0 2px 20px rgba(0,0,0,0.04)' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* 로고 */}
        <Link to="/" className="text-base font-bold text-[#1A1A1A] hover:text-[#FF9F66] transition-colors duration-200 shrink-0">
          선생님의 서랍
        </Link>

        {/* 중앙 앵커 링크 */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ label, target }) => (
            <button
              key={target}
              onClick={() => scrollTo(target)}
              className="px-4 py-2 text-sm text-gray-500 hover:text-[#1A1A1A] rounded-lg transition-colors duration-150 cursor-pointer"
              style={{ background: 'none', border: 'none' }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 우측 버튼 */}
        <div className="flex items-center gap-1">
          <Link
            to="/login"
            className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-[#1A1A1A] rounded-lg transition-colors duration-150"
          >
            로그인
          </Link>
          <Link
            to="/signup"
            className="ml-1 px-4 py-2 bg-[#1A1A1A] hover:bg-[#333] text-white text-sm font-semibold rounded-lg transition-all duration-200"
            style={{ transition: 'background 0.2s, transform 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.03)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ── Hero: Mock App Card ───────────────────────────────────────────────────
function MockAppCard() {
  return (
    <div
      className="relative w-full max-w-[420px] mx-auto"
      style={{ animation: 'td-float 4s ease-in-out infinite' }}
    >
      {/* depth shadow layers */}
      <div className="absolute top-3 left-3 w-full h-full bg-orange-100/60 rounded-3xl" />
      <div className="absolute top-6 left-6 w-full h-full bg-orange-50/60 rounded-3xl" />

      <div className="relative bg-white rounded-3xl shadow-xl shadow-orange-100/60 p-5 border border-orange-50">
        {/* window dots */}
        <div className="flex items-center gap-1.5 mb-4">
          <div className="w-3 h-3 rounded-full bg-red-300" />
          <div className="w-3 h-3 rounded-full bg-yellow-300" />
          <div className="w-3 h-3 rounded-full bg-green-300" />
          <span className="ml-2 text-xs text-gray-400">활동계획안 — 2026.05.08</span>
        </div>

        {/* file badge */}
        <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-2xl mb-4">
          <div className="w-9 h-9 bg-[#FF9F66] rounded-xl flex items-center justify-center">
            <span className="text-white text-[11px] font-extrabold tracking-tight">HWP</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700 truncate">CASE_5_8.hwp</p>
            <p className="text-[11px] text-gray-400">자동 분석 완료 · 7개 활동 · 6명 아이</p>
          </div>
          <span className="text-[10px] font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-full">완료</span>
        </div>

        {/* activity list */}
        <div className="space-y-1.5 mb-4">
          {[
            { time: '09:00', label: '등원 및 자유 선택 활동', dot: 'bg-[#FF9F66]', bg: 'bg-orange-50' },
            { time: '09:30', label: '안전 교육 (교통안전)', dot: 'bg-blue-300', bg: 'bg-blue-50/60' },
            { time: '12:00', label: '점심 및 양치 지도', dot: 'bg-green-300', bg: 'bg-green-50/60' },
            { time: '14:30', label: '바깥 놀이 활동', dot: 'bg-purple-300', bg: 'bg-purple-50/60' },
          ].map(({ time, label, dot, bg }) => (
            <div key={time} className={`flex items-center gap-2.5 px-3 py-2 ${bg} rounded-xl`}>
              <div className={`w-1.5 h-1.5 rounded-full ${dot} shrink-0`} />
              <span className="text-[10px] text-gray-400 w-9 shrink-0">{time}</span>
              <span className="text-[11px] text-gray-700 font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* child tags */}
        <div className="border-t border-gray-50 pt-3">
          <p className="text-[10px] text-gray-400 mb-2 font-medium">인식된 아이</p>
          <div className="flex flex-wrap gap-1">
            {['김민준', '이서연', '박지호', '최하윤', '정유진', '+4명'].map((name) => (
              <span
                key={name}
                className="text-[10px] px-2 py-0.5 bg-orange-50 text-[#FF9F66] rounded-full border border-orange-100 font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────
function HeroSection() {
  const HEADLINE = '선생님의 반복 업무를\n줄여드립니다';
  const displayed = useTypewriter(HEADLINE, 52, 500);
  const isDone = displayed.length >= HEADLINE.length;

  return (
    <section className="min-h-screen bg-gradient-to-br from-[#FFF8F0] via-[#FFF4E8] to-[#FFE8CC] flex items-center pt-20">
      <div className="max-w-6xl mx-auto px-6 py-20 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left */}
          <div style={{ animation: 'td-fade-up 0.8s ease-out both' }}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-orange-100 rounded-full text-[#FF9F66] text-xs font-bold mb-6">
              <span
                className="w-1.5 h-1.5 bg-[#FF9F66] rounded-full"
                style={{ animation: 'td-pulse-dot 1.6s ease-in-out infinite' }}
              />
              유치원 선생님을 위한 서비스
            </div>

            <h1 className="text-4xl lg:text-[3.2rem] font-bold text-[#1A1A1A] leading-tight mb-6 whitespace-pre-line min-h-[8rem]">
              {displayed}
              {!isDone && (
                <span
                  className="inline-block w-[3px] h-[0.85em] bg-[#FF9F66] ml-1 align-middle rounded-sm"
                  style={{ animation: 'td-blink 0.85s ease-in-out infinite' }}
                />
              )}
            </h1>

            <p className="text-lg text-[#666] mb-8 leading-relaxed max-w-lg">
              활동계획안 자동 분석부터 추천형 에디터까지.
              <br />
              선생님이 아이에게 집중할 수 있도록.
            </p>

            <div className="flex items-center gap-4 flex-wrap">
              <Link
                to="/signup"
                className="px-8 py-4 bg-[#FF9F66] text-white text-base font-bold rounded-2xl transition-all duration-200 active:scale-[0.97]"
                style={{ transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#f08c52';
                  e.currentTarget.style.transform = 'scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 8px 28px rgba(255,159,102,0.35)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#FF9F66';
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                무료로 시작하기 →
              </Link>
              <Link
                to="/login"
                className="px-8 py-4 bg-white text-gray-600 text-base font-semibold rounded-2xl border border-gray-100 transition-all duration-200"
                style={{ transition: 'background 0.2s, transform 0.15s, box-shadow 0.15s' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = '#FFF4EC';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                로그인
              </Link>
            </div>

            <p className="text-sm text-gray-400 mt-5">회원가입 1분</p>
          </div>

          {/* Right */}
          <div
            className="flex justify-center lg:justify-end"
            style={{ animation: 'td-fade-up 0.9s ease-out 0.25s both' }}
          >
            <MockAppCard />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Feature Card ──────────────────────────────────────────────────────────
interface FeatureCardProps {
  icon: string;
  title: string;
  desc: string;
  delay: number;
}

function FeatureCard({ icon, title, desc, delay }: FeatureCardProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`bg-white rounded-3xl p-7 border border-orange-50 transition-all duration-700 cursor-default
        ${isVisible ? 'opacity-100 translate-y-0 shadow-sm shadow-orange-50' : 'opacity-0 translate-y-8'}`}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 32px rgba(255,159,102,0.15)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = isVisible ? 'translateY(0)' : 'translateY(32px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 3px rgba(255,159,102,0.1)';
      }}
    >
      <div className="text-4xl mb-4 select-none">{icon}</div>
      <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{title}</h3>
      <p className="text-sm text-[#666] leading-relaxed">{desc}</p>
    </div>
  );
}

// ── Features Section ──────────────────────────────────────────────────────
function FeaturesSection() {
  const { ref, isVisible } = useScrollReveal();

  const features = [
    {
      icon: '📁',
      title: 'HWP 자동 분석',
      desc: '한글 파일을 올리면 시간대별 활동, 아이별 교구가 자동으로 정리됩니다.',
    },
    {
      icon: '👶',
      title: '아이 자동 등록',
      desc: '파일 안의 아이 이름을 인식해 자동 등록. 확인만 하면 끝.',
    },
    {
      icon: '📅',
      title: '누적 캘린더',
      desc: '한 아이가 어떤 활동을 했는지 연도를 넘어 캘린더에 한눈에.',
    },
    {
      icon: '✨',
      title: '추천형 에디터',
      desc: '"등원" 입력하면 작년에 쓴 문장을 추천. 반복 입력 끝.',
    },
  ];

  return (
    <section id="features" className="py-28 bg-[#FFF8F0]">
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className={`text-center mb-16 transition-all duration-700 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] mb-4">핵심 기능 4가지</h2>
          <p className="text-[#666] text-lg">반복 업무를 줄이고, 아이에게 집중할 시간을 만들어드립니다</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon, title, desc }, i) => (
            <FeatureCard key={title} icon={icon} title={title} desc={desc} delay={i * 110} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Editor Demo ───────────────────────────────────────────────────────────
const SUGGESTIONS = ['등원 및 인사 나누기', '등원 놀이 활동', '자유 선택 활동'];

type EditorPhase = 'idle' | 'typing' | 'done-typing' | 'dropdown' | 'highlight' | 'selected' | 'pause';

function EditorDemo() {
  const [phase, setPhase] = useState<EditorPhase>('idle');
  const [typed, setTyped] = useState('');
  const [highlighted, setHighlighted] = useState(-1);
  const [inserted, setInserted] = useState('');

  useEffect(() => {
    let stopped = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const later = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (!stopped) fn();
      }, ms);
      timers.push(t);
    };

    const loop = () => {
      setPhase('idle');
      setTyped('');
      setHighlighted(-1);
      setInserted('');

      later(() => { setPhase('typing'); setTyped('등'); }, 1100);
      later(() => { setTyped('등원'); setPhase('done-typing'); }, 1750);
      later(() => { setPhase('dropdown'); }, 2300);
      later(() => { setPhase('highlight'); setHighlighted(0); }, 2950);
      later(() => {
        setPhase('selected');
        setInserted(SUGGESTIONS[0]);
        setTyped('');
        setHighlighted(-1);
      }, 3700);
      later(() => { setPhase('pause'); }, 4500);
      later(() => { if (!stopped) loop(); }, 7200);
    };

    const init = setTimeout(() => { if (!stopped) loop(); }, 700);

    return () => {
      stopped = true;
      clearTimeout(init);
      timers.forEach(clearTimeout);
    };
  }, []);

  const showDropdown = phase === 'dropdown' || phase === 'highlight';
  const showCursor = phase !== 'selected' && phase !== 'pause';

  return (
    <div className="bg-white rounded-2xl shadow-lg shadow-gray-100 border border-gray-100 overflow-hidden w-full max-w-md">
      {/* title bar */}
      <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="w-2.5 h-2.5 rounded-full bg-red-300" />
        <div className="w-2.5 h-2.5 rounded-full bg-yellow-300" />
        <div className="w-2.5 h-2.5 rounded-full bg-green-300" />
        <span className="ml-2 text-xs text-gray-400">활동계획안 편집</span>
        <div className="ml-auto flex items-center gap-1">
          <span
            className="text-[10px] text-green-500 font-semibold bg-green-50 px-2 py-0.5 rounded-full"
            style={{ opacity: phase === 'selected' || phase === 'pause' ? 1 : 0, transition: 'opacity 0.3s' }}
          >
            자동 저장됨
          </span>
        </div>
      </div>

      {/* editor body */}
      <div className="p-5 font-mono text-sm">
        {/* existing text */}
        <div className="space-y-1.5 mb-3 text-gray-500 text-xs">
          <div className="flex gap-3">
            <span className="text-gray-200 w-4 text-right shrink-0">1</span>
            <span>
              <span className="text-gray-300">09:00 </span>
              <span className="text-gray-600">등원 및 자유 선택 활동</span>
            </span>
          </div>
          <div className="flex gap-3">
            <span className="text-gray-200 w-4 text-right shrink-0">2</span>
            <span className="text-gray-300 italic pl-6">↳ 자유 놀이 환경 탐색...</span>
          </div>
          <div className="flex gap-3">
            <span className="text-gray-200 w-4 text-right shrink-0">3</span>
            <span>&nbsp;</span>
          </div>
        </div>

        {/* active editing line */}
        <div className="flex gap-3 items-start relative">
          <span className="text-[#FF9F66] w-4 text-right text-xs shrink-0 mt-0.5">4</span>
          <div className="flex-1 relative min-h-[1.5rem]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-300 text-xs">09:20</span>

              {phase === 'selected' || phase === 'pause' ? (
                <span
                  className="text-[#FF9F66] font-semibold text-xs"
                  style={{ animation: phase === 'selected' ? 'td-fade-in 0.25s ease-out' : 'none' }}
                >
                  {inserted}
                </span>
              ) : (
                <>
                  <span className="text-gray-700 text-xs">{typed}</span>
                  {showCursor && (
                    <span
                      className="inline-block w-0.5 h-[0.95em] bg-[#FF9F66] align-middle rounded-sm"
                      style={{ animation: 'td-blink 0.85s ease-in-out infinite' }}
                    />
                  )}
                </>
              )}
            </div>

            {/* autocomplete dropdown */}
            {showDropdown && (
              <div
                className="absolute top-full left-0 z-10 mt-1.5 bg-white rounded-xl shadow-xl shadow-gray-200/70 border border-gray-100 overflow-hidden w-56"
                style={{ animation: 'td-dropdown-in 0.18s ease-out both' }}
              >
                <div className="px-3 py-1.5 bg-orange-50 border-b border-orange-100 flex items-center gap-1.5">
                  <span className="text-[10px] text-[#FF9F66] font-bold">✨ 과거 자료 추천</span>
                </div>
                {SUGGESTIONS.map((s, i) => (
                  <div
                    key={s}
                    className="px-3 py-2 text-xs transition-colors duration-150"
                    style={{
                      background: highlighted === i ? '#FFF4EC' : 'transparent',
                      color: highlighted === i ? '#FF9F66' : '#555',
                      fontWeight: highlighted === i ? '600' : '400',
                    }}
                  >
                    {highlighted === i && <span className="mr-1.5">›</span>}
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* status bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 border-t border-gray-100">
        <span className="text-[10px] text-gray-400">
          {phase === 'idle' ? '준비됨' :
           phase === 'typing' || phase === 'done-typing' ? '"등원" 입력 중...' :
           phase === 'dropdown' || phase === 'highlight' ? '과거 자료 추천 중 →' :
           '✓ 자동완성 적용됨'}
        </span>
      </div>
    </div>
  );
}

// ── Editor Demo Section ───────────────────────────────────────────────────
function EditorDemoSection() {
  const { ref: textRef, isVisible: textVisible } = useScrollReveal();
  const { ref: demoRef, isVisible: demoVisible } = useScrollReveal();

  return (
    <section id="editor" className="py-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, #1C1C1C 0%, #2A2A2A 100%)' }}>
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: description */}
          <div
            ref={textRef}
            className="transition-all duration-700"
            style={{
              opacity: textVisible ? 1 : 0,
              transform: textVisible ? 'translateX(0)' : 'translateX(-32px)',
            }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[#FF9F66] text-xs font-bold mb-6"
              style={{ background: 'rgba(255,159,102,0.15)' }}>
              <span>✨</span>
              핵심 차별점
            </div>

            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-8 leading-tight">
              IDE 자동완성처럼
              <br />
              <span className="text-[#FF9F66]">과거 자료가 추천돼요</span>
            </h2>

            <div className="space-y-6">
              {[
                {
                  icon: '⌨️',
                  title: '"등원" 입력하면 작년 문장 추천',
                  desc: '반복적으로 쓰는 문장을 기억해서, 몇 글자만 입력하면 바로 제안합니다.',
                },
                {
                  icon: '/',
                  title: '/ 로 담당 아이 목록·표 템플릿 삽입',
                  desc: '슬래시 메뉴로 현재 반의 아이 목록이나 이전 표 형식을 바로 불러옵니다.',
                },
                {
                  icon: '⏱️',
                  title: '반복 입력에 쓰는 시간을 아이와 함께',
                  desc: '처음부터 다시 쓰는 문서 작성, 이제 과거 자료로 빠르게 완성하세요.',
                },
              ].map(({ icon, title, desc }, i) => (
                <div
                  key={title}
                  className="flex items-start gap-4 transition-all duration-700"
                  style={{
                    opacity: textVisible ? 1 : 0,
                    transform: textVisible ? 'translateX(0)' : 'translateX(-16px)',
                    transitionDelay: `${i * 120 + 200}ms`,
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 font-bold"
                    style={{ background: 'rgba(255,159,102,0.18)', color: '#FF9F66' }}
                  >
                    {icon}
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm mb-1">{title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: '#999' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: editor demo */}
          <div
            ref={demoRef}
            className="flex justify-center transition-all duration-700"
            style={{
              opacity: demoVisible ? 1 : 0,
              transform: demoVisible ? 'translateX(0)' : 'translateX(32px)',
              transitionDelay: '150ms',
            }}
          >
            <EditorDemo />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works: Step Card ───────────────────────────────────────────────
interface StepCardProps {
  num: string;
  icon: string;
  title: string;
  desc: string;
  bgFrom: string;
  bgTo: string;
  accentColor: string;
  delay: number;
}

function StepCard({ num, icon, title, desc, bgFrom, bgTo, accentColor, delay }: StepCardProps) {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div
      ref={ref}
      className="transition-all duration-700"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
        transitionDelay: `${delay}ms`,
      }}
    >
      <div
        className="rounded-3xl p-7 text-center h-full"
        style={{ background: `linear-gradient(135deg, ${bgFrom}, ${bgTo})` }}
      >
        <div className="w-14 h-14 rounded-2xl bg-white shadow-sm mx-auto mb-4 flex items-center justify-center text-2xl select-none">
          {icon}
        </div>
        <div className="text-xs font-bold mb-2" style={{ color: accentColor }}>
          STEP {num}
        </div>
        <h3 className="text-lg font-bold text-[#1A1A1A] mb-3">{title}</h3>
        <p className="text-sm text-[#666] leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

// ── How It Works Section ──────────────────────────────────────────────────
function HowItWorksSection() {
  const { ref, isVisible } = useScrollReveal();

  const steps = [
    {
      num: '1',
      icon: '📤',
      title: 'HWP 업로드',
      desc: '기존 활동계획안 그대로 올리면 됩니다. 형식 변환 불필요.',
      bgFrom: '#FFF4EC',
      bgTo: '#FFE8D0',
      accentColor: '#FF9F66',
    },
    {
      num: '2',
      icon: '⚡',
      title: '자동 분석 + 등록',
      desc: '아이, 반, 활동이 자동으로 정리됩니다. 확인만 하면 끝.',
      bgFrom: '#EFF6FF',
      bgTo: '#DBEAFE',
      accentColor: '#3B82F6',
    },
    {
      num: '3',
      icon: '✨',
      title: '추천으로 다음 문서 작성',
      desc: '과거 자료가 자동 추천. 처음부터 다시 쓸 필요 없어요.',
      bgFrom: '#F5F3FF',
      bgTo: '#EDE9FE',
      accentColor: '#8B5CF6',
    },
  ];

  return (
    <section id="how-it-works" className="py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div
          ref={ref}
          className="text-center mb-16 transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(24px)',
          }}
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] mb-4">
            3단계로 끝나는 업무 흐름
          </h2>
          <p className="text-[#666] text-lg">복잡한 설정 없이, 지금 쓰는 파일 그대로</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map(({ num, icon, title, desc, bgFrom, bgTo, accentColor }, i) => (
            <StepCard
              key={title}
              num={num}
              icon={icon}
              title={title}
              desc={desc}
              bgFrom={bgFrom}
              bgTo={bgTo}
              accentColor={accentColor}
              delay={i * 140}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA Section ───────────────────────────────────────────────────────────
function CtaSection() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <section className="py-28 bg-[#FFF8F0]">
      <div className="max-w-3xl mx-auto px-6 text-center">
        <div
          ref={ref}
          className="transition-all duration-700"
          style={{
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(32px)',
          }}
        >
          <div
            className="text-5xl mb-6 select-none inline-block"
            style={{ animation: isVisible ? 'td-float 3.5s ease-in-out infinite' : 'none' }}
          >
            🗂️
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-[#1A1A1A] mb-4">
            지금 바로 시작해보세요
          </h2>
          <p className="text-[#666] text-lg mb-8">
            매주 반복되는 활동계획안 작업, 이제 절반으로 줄어듭니다.
          </p>
          <Link
            to="/signup"
            className="inline-block px-10 py-4 bg-[#FF9F66] text-white text-lg font-bold rounded-2xl transition-all duration-200 active:scale-[0.97]"
            style={{ transition: 'background 0.2s, transform 0.15s, box-shadow 0.2s' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#f08c52';
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 12px 36px rgba(255,159,102,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#FF9F66';
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            무료로 시작하기 →
          </Link>
          <p className="text-sm text-gray-400 mt-4">회원가입 1분</p>
        </div>
      </div>
    </section>
  );
}

// ── Footer: Social Icons ──────────────────────────────────────────────────
function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function IconInstagram() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function IconLinkedIn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function IconYouTube() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
      <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────
const FOOTER_LINKS = [
  {
    heading: '서비스',
    items: [
      { label: '기능 소개', onClick: () => scrollTo('features') },
      { label: '에디터 데모', onClick: () => scrollTo('editor') },
      { label: '사용 방법', onClick: () => scrollTo('how-it-works') },
      { label: '가격 (무료)', onClick: null },
    ],
  },
  {
    heading: '지원',
    items: [
      { label: '도움말', onClick: null },
      { label: '문의하기', onClick: null },
      { label: '이용약관', onClick: null },
      { label: '개인정보처리방침', onClick: null },
    ],
  },
  {
    heading: '회사',
    items: [
      { label: '소개', onClick: null },
      { label: '블로그', onClick: null },
      { label: '채용', onClick: null },
      { label: '보안', onClick: null },
    ],
  },
];

function Footer() {
  return (
    <footer style={{ background: '#111' }}>
      {/* 메인 영역 */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* 컬럼 1: 브랜드 */}
          <div className="md:col-span-1">
            <p className="text-white font-bold text-base mb-3">선생님의 서랍</p>
            <p className="text-sm leading-relaxed mb-6" style={{ color: '#888' }}>
              유치원 선생님의 반복 업무를
              <br />줄이는 서비스
            </p>
            {/* SNS 아이콘 */}
            <div className="flex items-center gap-3">
              {[
                { icon: <IconX />, label: 'X(Twitter)' },
                { icon: <IconInstagram />, label: 'Instagram' },
                { icon: <IconLinkedIn />, label: 'LinkedIn' },
                { icon: <IconYouTube />, label: 'YouTube' },
              ].map(({ icon, label }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-150 cursor-pointer"
                  style={{ background: '#222', color: '#888', border: 'none' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#333';
                    (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = '#222';
                    (e.currentTarget as HTMLButtonElement).style.color = '#888';
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          {/* 컬럼 2–4: 링크 그룹 */}
          {FOOTER_LINKS.map(({ heading, items }) => (
            <div key={heading}>
              <p className="text-white text-xs font-semibold uppercase tracking-widest mb-4">{heading}</p>
              <ul className="space-y-3">
                {items.map(({ label, onClick }) => (
                  <li key={label}>
                    {onClick ? (
                      <button
                        onClick={onClick}
                        className="text-sm transition-colors duration-150 cursor-pointer"
                        style={{ background: 'none', border: 'none', padding: 0, color: '#888' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLButtonElement).style.color = '#fff')}
                        onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.color = '#888')}
                      >
                        {label}
                      </button>
                    ) : (
                      <span className="text-sm" style={{ color: '#555' }}>{label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 바 */}
      <div style={{ borderTop: '1px solid #222' }}>
        <div className="max-w-6xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap gap-3">
          <p className="text-xs" style={{ color: '#555' }}>
            © 2026 선생님의 서랍. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: '#555' }}>한국어</span>
            <Link to="/login" className="text-xs transition-colors duration-150" style={{ color: '#555' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#fff')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#555')}
            >
              로그인
            </Link>
            <Link to="/signup" className="text-xs transition-colors duration-150" style={{ color: '#FF9F66' }}
              onMouseEnter={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#f08c52')}
              onMouseLeave={e => ((e.currentTarget as HTMLAnchorElement).style.color = '#FF9F66')}
            >
              무료로 시작하기 →
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Landing Page ──────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ animation: 'td-fade-in 0.35s ease-out' }}>
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      <EditorDemoSection />
      <HowItWorksSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
