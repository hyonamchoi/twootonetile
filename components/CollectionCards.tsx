/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { Collection, Tile } from '@/lib/tiles';
import { tileImageSrc } from './tile/TileThumb';
import Reveal from './Reveal';

/** 컬렉션 카드. 클릭하면 해당 컬렉션이 선택된 시뮬레이터로 이동한다. */
export default function CollectionCards({ collections, tiles }: { collections: Collection[]; tiles: Tile[] }) {
  return (
    <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c, i) => {
        const members = tiles.filter((t) => t.collectionId === c.id);
        const strip = members.slice(0, 4);
        return (
          <Reveal key={c.id} delay={i * 60}>
            <Link
              href={`/visualizer?collection=${encodeURIComponent(c.id)}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper transition-all duration-300 hover:-translate-y-1 hover:border-line-strong hover:shadow-lift"
            >
              <div className="grid grid-cols-4">
                {strip.map((t) => (
                  <img key={t.id} src={tileImageSrc(t, 160) ?? ''} alt="" className="aspect-square w-full object-cover" />
                ))}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-bold text-ink">{c.name}</h3>
                {c.description && <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{c.description}</p>}
                <p className="mt-auto pt-4 text-xs font-semibold text-clay">
                  <span className="text-ink-faint">{members.length}종</span>
                  <span className="ml-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">이 컬렉션으로 시뮬레이션 →</span>
                </p>
              </div>
            </Link>
          </Reveal>
        );
      })}
    </div>
  );
}
