import type { Collection, Tile } from '@/lib/tiles';
import CollectionCards from './CollectionCards';
import Reveal from './Reveal';

export default function TrendGallery({ collections, tiles }: { collections: Collection[]; tiles: Tile[] }) {
  if (collections.length === 0) return null;
  return (
    <section id="collections" className="w-full border-t border-line bg-paper-raised">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-clay">Collections</p>
          <h2 className="font-display mt-3 text-3xl font-bold tracking-tight text-ink md:text-4xl">
            지금 눈여겨볼 타일 컬렉션
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft md:text-base">
            이탈리아·스페인에서 주목받는 분위기를 컬렉션으로 묶었습니다. 컬렉션을 고르면 시뮬레이터에서 바로 적용해 볼 수 있습니다.
          </p>
        </Reveal>

        <CollectionCards collections={collections} tiles={tiles} />
      </div>
    </section>
  );
}
