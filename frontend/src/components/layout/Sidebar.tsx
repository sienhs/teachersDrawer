import { NavLink } from 'react-router-dom';

interface MenuItem {
  to: string;
  label: string;
  ready: boolean; // 이번 단계에서 실제 동작하는 페이지인지
}

const MENU: MenuItem[] = [
  { to: '/dashboard', label: '대시보드', ready: true },
  { to: '/activity-plans', label: '활동계획안', ready: false },
  { to: '/children', label: '아이 관리', ready: false },
  { to: '/classrooms', label: '반 관리', ready: false },
];

export default function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-orange-100/60 bg-white/70 px-3 py-5">
      <nav className="space-y-1">
        {MENU.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[#FF9F66] text-white shadow-sm'
                  : 'text-gray-600 hover:-translate-y-0.5 hover:bg-orange-50 hover:text-[#FF9F66]'
              }`
            }
          >
            <span>{item.label}</span>
            {!item.ready && (
              <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400">
                준비 중
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* 하단: 현재 활성 반 (다음 단계에서 컨텍스트로 활용) */}
      <div className="rounded-xl bg-orange-50/60 px-4 py-3">
        <p className="text-[11px] font-semibold text-[#FF9F66]">현재 활성 반</p>
        <p className="mt-1 text-sm text-gray-500">아직 선택되지 않음</p>
      </div>
    </aside>
  );
}
