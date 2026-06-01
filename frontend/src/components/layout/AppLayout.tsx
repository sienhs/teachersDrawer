import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

// 전체 화면 레이아웃: 헤더(상단 고정) + 사이드바(좌측) + 메인(우측 Outlet)
export default function AppLayout() {
  return (
    <div className="min-h-screen bg-[#FFF8F0]">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
