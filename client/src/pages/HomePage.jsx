import { CtaBanner, Features, Hero, LandingFooter, LandingNavbar } from '../features/landing';

// Public landing page, shown before sign-in.
export default function HomePage() {
  return (
    <div className="min-h-screen bg-navy font-landing text-white">
      <LandingNavbar />
      <main>
        <Hero />
        <Features />
        <CtaBanner />
      </main>
      <LandingFooter />
    </div>
  );
}
