import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

// Logged-in layout: fixed 256px sidebar + sticky top bar; the page content scrolls underneath.
export default function AppShell() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false); // close the mobile drawer after navigating
  }, [pathname]);

  return (
    <div className="min-h-screen bg-dash-bg font-body text-dash-text">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="md:pl-64">
        <Navbar onMenuClick={() => setMenuOpen(true)} />
        <main className="px-5 pb-5 pt-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
