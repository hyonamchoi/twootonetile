import Header from '@/components/Header';
import Hero from '@/components/Hero';
import TrendGallery from '@/components/TrendGallery';
import HowItWorks from '@/components/HowItWorks';
import DealerSection from '@/components/DealerSection';
import Faq from '@/components/Faq';
import Footer from '@/components/Footer';
import { readDb } from '@/lib/server/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = await readDb();
  const visible = new Set(db.collections.filter((c) => c.visible).map((c) => c.id));
  const tiles = db.tiles.filter((t) => t.active && (!t.collectionId || visible.has(t.collectionId)));
  const collections = db.collections.filter((c) => c.visible).sort((a, b) => a.order - b.order);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Hero tiles={tiles} />
        <TrendGallery collections={collections} tiles={tiles} />
        <HowItWorks />
        <DealerSection />
        <Faq />
      </main>
      <Footer />
    </div>
  );
}
