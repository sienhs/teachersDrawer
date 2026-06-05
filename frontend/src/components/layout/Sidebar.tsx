import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';
import { activityPlanApi } from '../../api/activityPlan';
import useAuthStore from '../../store/authStore';
import type { ActivityPlanSummary } from '../../types/activityPlan';

// ── 상수 ──────────────────────────────────────────────────────────────────
const W_OPEN   = 240;
const W_CLOSED =  56;

const MENU = [
  { to: '/dashboard',      label: '대시보드',   icon: '📊', ready: true  },
  { to: '/activity-plans', label: '활동계획안', icon: '📁', ready: true  },
  { to: '/children',       label: '아이 관리',  icon: '👶', ready: true  },
  { to: '/classrooms',     label: '반 관리',    icon: '🏫', ready: false },
] as const;

// ── 텍스트 페이드 헬퍼 ───────────────────────────────────────────────────
// collapsed 시 opacity 0 + pointer-events none, 아니면 1
function fadeStyle(collapsed: boolean, delayExpand = 0): React.CSSProperties {
  return {
    opacity: collapsed ? 0 : 1,
    transition: collapsed
      ? 'opacity 0.12s ease'
      : `opacity 0.18s ease ${delayExpand}ms`,
    pointerEvents: collapsed ? 'none' : undefined,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
  };
}

// ── Props ─────────────────────────────────────────────────────────────────
interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ── Sidebar ───────────────────────────────────────────────────────────────
export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const user      = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const navigate  = useNavigate();

  // 최근 문서 목록
  const [plans, setPlans] = useState<ActivityPlanSummary[]>([]);
  const fetchPlans = () => {
    activityPlanApi.list().then((list) => setPlans(list.slice(0, 6))).catch(() => {});
  };
  useEffect(() => {
    fetchPlans();
    const handler = () => fetchPlans();
    window.addEventListener('activity-plans-changed', handler);
    return () => window.removeEventListener('activity-plans-changed', handler);
  }, []);

  const handleLogout = async () => {
    try { await logout(); } catch { /* 클라이언트는 항상 정리 */ }
    clearAuth();
    navigate('/login');
  };

  const W = collapsed ? W_CLOSED : W_OPEN;

  return (
    <aside
      className="shrink-0 sticky top-0 h-screen flex flex-col overflow-hidden"
      style={{
        width: W,
        minWidth: W,
        transition: 'width 0.25s ease, min-width 0.25s ease',
        background: '#F7F7F5',
        borderRight: '1px solid #E9E9E7',
      }}
    >
      {/* ── 워크스페이스 헤더 ──────────────────────────── */}
      <div
        className="flex items-center px-2 pt-4 pb-2"
        style={{ minHeight: 52, gap: 4 }}
      >
        {/* 로고 버튼 */}
        <NavBtn
          onClick={() => navigate('/dashboard')}
          title={collapsed ? '선생님의 서랍' : undefined}
          style={{ flex: 1, minWidth: 0 }}
        >
          <span className="text-base shrink-0 select-none">🗂️</span>
          <span className="truncate font-semibold text-sm" style={fadeStyle(collapsed, 120)}>
            선생님의 서랍
          </span>
        </NavBtn>

        {/* 접기 버튼 (펼쳐진 상태에서만) */}
        <button
          onClick={onToggle}
          title="사이드바 접기"
          className="shrink-0 rounded-lg flex items-center justify-center"
          style={{
            width: 24, height: 24,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#BEBCBA',
            opacity: collapsed ? 0 : 1,
            transition: 'opacity 0.15s ease, color 0.1s, background 0.1s',
            pointerEvents: collapsed ? 'none' : undefined,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#DDDCDA';
            e.currentTarget.style.color = '#37352F';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#BEBCBA';
          }}
        >
          {/* 왼쪽 화살표 */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* ── 펼치기 버튼 (접힌 상태에서만 표시) ────────── */}
      <div
        className="px-2 pb-1 flex justify-center"
        style={{
          opacity: collapsed ? 1 : 0,
          transition: collapsed ? 'opacity 0.18s ease 0.1s' : 'opacity 0.08s ease',
          pointerEvents: collapsed ? undefined : 'none',
          height: collapsed ? 'auto' : 0,
          overflow: 'hidden',
        }}
      >
        <button
          onClick={onToggle}
          title="사이드바 펼치기"
          className="rounded-lg flex items-center justify-center"
          style={{
            width: 32, height: 20,
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#BEBCBA',
            transition: 'color 0.1s, background 0.1s',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = '#DDDCDA';
            e.currentTarget.style.color = '#37352F';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#BEBCBA';
          }}
        >
          {/* 오른쪽 화살표 */}
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      {/* ── 검색 ──────────────────────────────────────── */}
      <div className="px-2 pb-1">
        <div
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-not-allowed"
          style={{ color: '#BEBCBA' }}
          title={collapsed ? '검색 (준비 중)' : undefined}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-sm" style={fadeStyle(collapsed)}>검색</span>
          <span
            className="ml-auto text-[10px] rounded px-1"
            style={{ ...fadeStyle(collapsed), background: '#E9E9E7' }}
          >
            준비 중
          </span>
        </div>
      </div>

      {/* ── 구분선 ────────────────────────────────────── */}
      <div className="mx-2 my-1" style={{ borderTop: '1px solid #E9E9E7' }} />

      {/* ── 네비게이션 ────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto px-1 py-1 space-y-0.5">
        <p
          className="px-3 pt-4 pb-1 text-[10px] font-semibold uppercase tracking-widest"
          style={{ ...fadeStyle(collapsed), color: '#BEBCBA' }}
        >
          워크스페이스
        </p>

        {MENU.map((item) =>
          item.ready ? (
            <NavLink
              key={item.to}
              to={item.to}
              title={collapsed ? item.label : undefined}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-sm"
              style={({ isActive }) => ({
                fontWeight: isActive ? 500 : 400,
                background: isActive ? '#FFEDE0' : 'transparent',
                color: isActive ? '#C96A30' : '#37352F',
                transition: 'background 0.1s, color 0.1s',
              })}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.dataset.active) el.style.background = '#EBEBEA';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                if (!el.dataset.active) el.style.background = 'transparent';
              }}
            >
              {({ isActive }) => (
                <>
                  <span className="text-base shrink-0 select-none" data-active={isActive ? 'true' : undefined}>
                    {item.icon}
                  </span>
                  <span style={fadeStyle(collapsed, 80)}>{item.label}</span>
                </>
              )}
            </NavLink>
          ) : (
            <div
              key={item.to}
              className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-sm cursor-not-allowed"
              style={{ color: '#BEBCBA' }}
              title={collapsed ? `${item.label} (준비 중)` : undefined}
            >
              <span className="text-base shrink-0 select-none">{item.icon}</span>
              <span style={fadeStyle(collapsed, 80)}>{item.label}</span>
              <span
                className="ml-auto text-[10px] rounded px-1.5 py-0.5 font-medium shrink-0"
                style={{ ...fadeStyle(collapsed), background: '#E9E9E7', color: '#BEBCBA' }}
              >
                준비 중
              </span>
            </div>
          ),
        )}
      </nav>

      {/* ── 문서 섹션 ────────────────────────────────── */}
      <div className="mx-2 my-1" style={{ borderTop: '1px solid #E9E9E7' }} />

      <div className="px-1 py-1">
        {/* + 새 문서 버튼 */}
        <NavBtn
          onClick={() => navigate('/editor/new')}
          title={collapsed ? '새 문서' : undefined}
          style={{ color: '#C96A30' }}
          hoverColor="#C96A30"
        >
          <span className="text-base shrink-0 select-none">📝</span>
          <span style={fadeStyle(collapsed, 80)}>+ 새 문서</span>
        </NavBtn>

        {/* 최근 문서 목록 */}
        {!collapsed && plans.length > 0 && (
          <div className="mt-0.5 space-y-0.5">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => navigate(`/activity-plans/${plan.id}`)}
                className="w-full flex flex-col items-start gap-0.5 px-3 py-1.5 rounded-lg text-left hover:bg-[#EBEBEA] transition-colors"
              >
                <span className="text-xs truncate w-full" style={{ color: '#37352F' }}>
                  {plan.subject || plan.fileName}
                </span>
                <span className="text-[10px]" style={{ color: '#9B9A97' }}>
                  {plan.planDate}{plan.classNameRaw ? ` · ${plan.classNameRaw}` : ''}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 하단 유저 ─────────────────────────────────── */}
      <div className="px-1 pb-3 pt-2" style={{ borderTop: '1px solid #E9E9E7' }}>
        {/* 유저 정보 */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div
            className="shrink-0 rounded-full flex items-center justify-center text-xs font-bold"
            style={{
              width: 28, height: 28,
              background: '#FFEDE0', color: '#C96A30',
            }}
            title={collapsed ? (user?.name ?? '') : undefined}
          >
            {user?.name?.charAt(0) ?? '?'}
          </div>
          <div className="min-w-0 flex-1" style={fadeStyle(collapsed, 80)}>
            <p className="text-sm font-medium truncate" style={{ color: '#37352F' }}>
              {user?.name ?? '선생님'}
            </p>
            <p className="text-[11px] truncate" style={{ color: '#9B9A97' }}>
              {user?.email ?? ''}
            </p>
          </div>
        </div>

        {/* 로그아웃 */}
        <NavBtn
          onClick={handleLogout}
          title={collapsed ? '로그아웃' : undefined}
          style={{ color: '#9B9A97' }}
          hoverColor="#37352F"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          <span style={fadeStyle(collapsed, 80)}>로그아웃</span>
        </NavBtn>
      </div>
    </aside>
  );
}

// ── 공통 네비 버튼 ─────────────────────────────────────────────────────────
interface NavBtnProps {
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
  style?: React.CSSProperties;
  hoverColor?: string;
}

function NavBtn({ onClick, children, title, style: extraStyle, hoverColor }: NavBtnProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="flex items-center gap-2.5 w-full px-3 py-1.5 rounded-lg text-sm"
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#37352F',
        transition: 'background 0.1s, color 0.1s',
        textAlign: 'left',
        ...extraStyle,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = '#EBEBEA';
        if (hoverColor) e.currentTarget.style.color = hoverColor;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'transparent';
        if (hoverColor) e.currentTarget.style.color = extraStyle?.color ?? '#37352F';
      }}
    >
      {children}
    </button>
  );
}
