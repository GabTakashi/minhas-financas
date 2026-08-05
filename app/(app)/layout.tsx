import PullToRefresh from '@/components/PullToRefresh';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PullToRefresh />
      <Sidebar />
      <div className="main">{children}</div>
    </>
  );
}
