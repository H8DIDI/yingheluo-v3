import { Outlet } from 'react-router-dom';
import { TopNav } from '../components/TopNav';
import { Footer } from '../components/Footer';

export default function MainLayout() {
  return (
    <div className="min-h-dvh bg-[#08090a] text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[520px] opacity-80 [background:radial-gradient(60%_80%_at_50%_0%,rgba(245,158,11,0.07),transparent_70%)]" />
      <TopNav />
      <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6 sm:py-10 md:py-12">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
