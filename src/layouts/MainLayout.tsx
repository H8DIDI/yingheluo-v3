import { Outlet } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-[#05050a] text-neutral-200">
      <TopNav />
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
