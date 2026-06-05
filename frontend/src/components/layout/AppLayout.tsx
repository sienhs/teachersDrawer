import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

const SIDEBAR_KEY = 'td_sidebar_collapsed';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState<boolean>(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true',
  );

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(SIDEBAR_KEY, String(next));
  };

  return (
    <div className="flex min-h-screen" style={{ background: '#fff' }}>
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="px-8 py-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
