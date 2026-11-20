import { useMemo } from 'react';
import { ArtCanvas } from './ArtCanvas';
import { cellSize, getRamp } from './engine/atlas';
import { renderTree } from './engine/treeModel';
import { useViewport } from './engine/viewport';

/** A detailed little tree with twinkling lights (login card, etc.). */
export function TreeArt({ rows, fontPx, className = '' }: { rows: number; fontPx: number; className?: string }) {
  const view = useViewport();
  const art = useMemo(() => {
    const { cw, ch } = cellSize(fontPx, view.dpr);
    return renderTree({ rows, aspect: ch / cw, ramp: getRamp(), seed: 25 });
  }, [rows, fontPx, view.dpr, view.font]);
  return <ArtCanvas art={art} fontPx={fontPx} className={className} />;
}
