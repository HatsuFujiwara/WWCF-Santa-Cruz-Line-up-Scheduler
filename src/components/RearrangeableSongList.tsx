import React, { useState, useRef } from 'react';
import {
  GripVertical,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Music,
  Check
} from 'lucide-react';
import { PlaylistItem } from '../services/youtubePlaylistService';

interface RearrangeableSongListProps {
  items: PlaylistItem[];
  onReorder: (newItems: PlaylistItem[]) => void;
  selectedItemsMap: Record<string, boolean>;
  onToggleItem: (videoId: string) => void;
}

export const RearrangeableSongList: React.FC<RearrangeableSongListProps> = ({
  items,
  onReorder,
  selectedItemsMap,
  onToggleItem
}) => {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(fromIndex, 1);
    copy.splice(toIndex, 0, moved);
    onReorder(copy);
  };

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    setDraggedIndex(index);
    setDragOverIndex(index);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const pointerY = moveEvent.clientY;

      // Auto-scroll near top/bottom edges
      const scrollThreshold = 45;
      const scrollSpeed = 10;

      if (pointerY < containerRect.top + scrollThreshold) {
        containerRef.current.scrollTop -= scrollSpeed;
      } else if (pointerY > containerRect.bottom - scrollThreshold) {
        containerRef.current.scrollTop += scrollSpeed;
      }

      // Find closest item element
      const itemElements = containerRef.current.querySelectorAll<HTMLElement>('[data-song-index]');
      let closestIndex = index;
      let minDistance = Infinity;

      itemElements.forEach((el) => {
        const itemIdx = parseInt(el.getAttribute('data-song-index') || '-1', 10);
        if (itemIdx === -1) return;

        const rect = el.getBoundingClientRect();
        const itemMiddleY = rect.top + rect.height / 2;
        const dist = Math.abs(pointerY - itemMiddleY);

        if (dist < minDistance) {
          minDistance = dist;
          closestIndex = itemIdx;
        }
      });

      setDragOverIndex(closestIndex);
    };

    const handlePointerUp = () => {
      if (autoScrollRef.current) {
        cancelAnimationFrame(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      setDraggedIndex((prevDragged) => {
        setDragOverIndex((prevOver) => {
          if (
            prevDragged !== null &&
            prevOver !== null &&
            prevDragged !== prevOver &&
            prevDragged >= 0 &&
            prevDragged < items.length &&
            prevOver >= 0 &&
            prevOver < items.length
          ) {
            const copy = [...items];
            const [moved] = copy.splice(prevDragged, 1);
            copy.splice(prevOver, 0, moved);
            onReorder(copy);
          }
          return null;
        });
        return null;
      });

      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Compute live preview array during dragging
  let displayItems = items;
  if (
    draggedIndex !== null &&
    dragOverIndex !== null &&
    draggedIndex !== dragOverIndex &&
    draggedIndex >= 0 &&
    draggedIndex < items.length &&
    dragOverIndex >= 0 &&
    dragOverIndex < items.length
  ) {
    const temp = [...items];
    const [moved] = temp.splice(draggedIndex, 1);
    temp.splice(dragOverIndex, 0, moved);
    displayItems = temp;
  }

  // Split into Praise (Pos 1 & 2) and Worship (Pos 3+)
  const praiseList = displayItems
    .map((item, idx) => ({ item, overallIndex: idx, positionNumber: idx + 1 }))
    .filter((x) => x.overallIndex < 2);

  const worshipList = displayItems
    .map((item, idx) => ({ item, overallIndex: idx, positionNumber: idx + 1 }))
    .filter((x) => x.overallIndex >= 2);

  const renderItemRow = (
    item: PlaylistItem,
    overallIndex: number,
    positionNumber: number,
    isPraise: boolean
  ) => {
    const isChecked = !!selectedItemsMap[item.videoId];
    const isBeingDragged = draggedIndex === overallIndex;

    return (
      <div
        key={item.videoId + '_' + overallIndex}
        data-song-index={overallIndex}
        className={`group relative flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-150 ${
          isBeingDragged
            ? 'bg-indigo-50 dark:bg-indigo-950/80 border-indigo-400 dark:border-indigo-600 shadow-lg scale-[1.01] z-20 opacity-95'
            : isChecked
            ? 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            : 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-50 hover:opacity-80'
        }`}
      >
        {/* Drag Handle */}
        <div
          onPointerDown={(e) => handlePointerDown(e, overallIndex)}
          className="touch-none cursor-grab active:cursor-grabbing p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
          title="Drag to reorder position"
        >
          <GripVertical className="w-4 h-4" />
        </div>

        {/* Position Number */}
        <span className="w-6 text-center text-xs font-bold font-mono text-slate-500 dark:text-slate-400 shrink-0">
          {positionNumber}.
        </span>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isChecked}
          onChange={() => onToggleItem(item.videoId)}
          className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 shrink-0 cursor-pointer"
        />

        {/* Thumbnail */}
        <img
          src={item.thumbnailUrl}
          alt={item.title}
          className="w-12 h-8 object-cover rounded shadow-xs border border-slate-200 dark:border-slate-800 shrink-0"
        />

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[240px] sm:max-w-[320px]">
              {item.title}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {item.artist} {item.album ? `• ${item.album}` : ''}
          </p>
        </div>

        {/* Category Badge */}
        <div className="shrink-0 hidden xs:block">
          {isPraise ? (
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 text-[10px] font-bold rounded-md uppercase tracking-wider">
              Praise
            </span>
          ) : (
            <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/80 text-[10px] font-bold rounded-md uppercase tracking-wider">
              Worship
            </span>
          )}
        </div>

        {/* Duration */}
        <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono shrink-0">
          {item.duration}
        </span>

        {/* Move Up / Move Down Buttons */}
        <div className="flex flex-col gap-0.5 shrink-0 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => moveItem(overallIndex, overallIndex - 1)}
            disabled={overallIndex === 0}
            className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 rounded"
            title="Move Up"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => moveItem(overallIndex, overallIndex + 1)}
            disabled={overallIndex === items.length - 1}
            className="p-0.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-20 rounded"
            title="Move Down"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl max-h-80 overflow-y-auto space-y-4 bg-slate-50/50 dark:bg-slate-900/50 select-none shadow-inner"
    >
      {/* Praise Group Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-xs font-bold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
              Praise Songs ({praiseList.length})
            </span>
          </div>
          <span className="text-[10px] font-medium text-amber-700/80 dark:text-amber-400">
            Positions 1 & 2
          </span>
        </div>

        <div className="space-y-1.5">
          {praiseList.length > 0 ? (
            praiseList.map(({ item, overallIndex, positionNumber }) =>
              renderItemRow(item, overallIndex, positionNumber, true)
            )
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-2">
              No praise songs assigned. Drag a song here to assign as Praise.
            </p>
          )}
        </div>
      </div>

      {/* Worship Group Section */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-2 py-1 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-900/50 rounded-lg">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200 uppercase tracking-wide">
              Worship Songs ({worshipList.length})
            </span>
          </div>
          <span className="text-[10px] font-medium text-indigo-700/80 dark:text-indigo-400">
            Positions 3+
          </span>
        </div>

        <div className="space-y-1.5">
          {worshipList.length > 0 ? (
            worshipList.map(({ item, overallIndex, positionNumber }) =>
              renderItemRow(item, overallIndex, positionNumber, false)
            )
          ) : (
            <p className="text-xs text-slate-400 italic text-center py-2">
              No worship songs assigned. Drag a song down to assign as Worship.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
