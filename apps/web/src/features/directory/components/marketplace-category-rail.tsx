'use client';

import { MARKETPLACE_CATEGORIES, type MarketplaceCategoryId } from '@gymsheet/domain';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/shared/lib/cn';

const CATEGORY_IMAGE: Record<MarketplaceCategoryId, string> = {
  all: 'todo',
  gyms: 'gimnasios',
  supplements: 'suplementos',
  apparel: 'indumentaria',
  equipment: 'equipamiento',
  coaches: 'coaches',
  centers: 'centros',
  passes: 'pases',
};

/** Max tilt in degrees: enough to read as a physical object, never enough to distort the icon. */
const TILT = 12;
const TILT_SPRING = { stiffness: 260, damping: 22, mass: 0.6 };
const LIFT_SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const;

function CategoryTile({
  id,
  label,
  index,
  selected,
  onSelect,
}: Readonly<{ id: MarketplaceCategoryId; label: string; index: number; selected: boolean; onSelect: () => void }>) {
  const reduced = useReducedMotion() ?? false;
  // Pointer position normalised to -0.5..0.5; springs keep the tilt physical and interruptible.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const glare = useSpring(0, TILT_SPRING);
  const rotateX = useSpring(useTransform(py, (v) => -v * TILT), TILT_SPRING);
  const rotateY = useSpring(useTransform(px, (v) => v * TILT), TILT_SPRING);
  // The icon drifts against the tilt: a parallax layer that sells the depth.
  const imageX = useTransform(rotateY, (v) => -v * 0.35);
  const imageY = useTransform(rotateX, (v) => v * 0.35);
  const glareX = useTransform(px, (v) => `${(v + 0.5) * 100}%`);
  const glareY = useTransform(py, (v) => `${(v + 0.5) * 100}%`);
  const glareBg = useMotionTemplate`radial-gradient(circle at ${glareX} ${glareY}, rgb(var(--sheen-channels) / 0.55), transparent 58%)`;

  // Tilt only follows a fine pointer: on touch the tile would freeze mid-tilt after the tap.
  const onPointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const box = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - box.left) / box.width - 0.5);
    py.set((event.clientY - box.top) / box.height - 0.5);
    glare.set(0.45);
  };
  const onPointerLeave = () => {
    px.set(0);
    py.set(0);
    glare.set(0);
  };

  return (
    <motion.button
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      aria-pressed={selected}
      className="tap group grid w-[5.75rem] shrink-0 justify-items-center gap-2 rounded-[1.5rem] pt-2 outline-none [perspective:700px] focus-visible:ring-2 focus-visible:ring-[var(--volt)]"
      data-category={id}
      initial={{ opacity: 0, y: 18, rotateX: -28 }}
      onClick={onSelect}
      onPointerLeave={onPointerLeave}
      onPointerMove={onPointerMove}
      tabIndex={selected ? 0 : -1}
      // The server renders the entrance pose, so reduced motion must still animate to rest — instantly.
      transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 24, delay: index * 0.05 }}
      type="button"
      whileTap={reduced ? undefined : { scale: 0.94 }}
    >
      <span className="relative block size-[5.25rem]">
        {/* Contact shadow: tightens and fades as the tile lifts off the floor. */}
        <motion.span
          animate={{ scaleX: selected ? 0.72 : 0.88, opacity: selected ? 0.35 : 0.55 }}
          aria-hidden
          className="absolute inset-x-2 -bottom-2 h-3 rounded-[50%] bg-[rgb(var(--scrim-channels))] blur-md"
          transition={LIFT_SPRING}
        />
        {selected ? (
          // One halo shared by every tile: it glides to the new selection instead of blinking.
          <motion.span
            aria-hidden
            className="absolute -inset-[3px] rounded-[1.6rem] ring-2 ring-[var(--volt)] shadow-[0_10px_28px_color-mix(in_srgb,var(--volt)_45%,transparent)]"
            layoutId="marketplace-category-halo"
            transition={reduced ? { duration: 0 } : LIFT_SPRING}
          />
        ) : null}
        <motion.span
          animate={{ y: selected ? -4 : 0, scale: selected ? 1.04 : 1 }}
          className={cn(
            'relative block size-full overflow-hidden rounded-[1.4rem] bg-[var(--surface-low)] [transform-style:preserve-3d]',
            'shadow-[inset_0_1px_0_rgb(var(--sheen-channels)/0.16),0_6px_14px_rgb(var(--scrim-channels)/0.3)]',
            selected ? '' : 'ring-1 ring-[color-mix(in_srgb,var(--text)_10%,transparent)]',
          )}
          style={{ rotateX, rotateY }}
          transition={LIFT_SPRING}
        >
          <motion.span className="absolute -inset-1.5 block" style={{ x: imageX, y: imageY }}>
            <Image
              alt=""
              className="object-cover"
              draggable={false}
              fill
              priority={index < 5}
              sizes="96px"
              unoptimized
              src={`/marketplace-categories/${CATEGORY_IMAGE[id]}.png`}
            />
          </motion.span>
          {/* Specular glare that follows the cursor; screen blend keeps the icon colours intact. */}
          <motion.span aria-hidden className="absolute inset-0 mix-blend-screen" style={{ background: glareBg, opacity: glare }} />
        </motion.span>
      </span>
      <span
        className={cn(
          'text-xs transition-colors duration-[var(--dur-2)]',
          selected ? 'font-bold text-[var(--text)]' : 'font-medium text-[var(--text-muted)] group-hover:text-[var(--text)]',
        )}
      >
        {label}
      </span>
    </motion.button>
  );
}

/**
 * Marketplace category rail with 3D depth: staggered entrance, pointer tilt with
 * parallax and glare, a lifted selected tile and one halo that glides between
 * selections. Arrow keys move the selection (roving tabindex).
 */
export function MarketplaceCategoryRail({
  value,
  onChange,
}: Readonly<{ value: MarketplaceCategoryId; onChange: (next: MarketplaceCategoryId) => void }>) {
  const railRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion() ?? false;

  const select = (id: MarketplaceCategoryId, focus = false) => {
    onChange(id);
    const tile = railRef.current?.querySelector<HTMLButtonElement>(`[data-category="${id}"]`);
    tile?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
    if (focus) tile?.focus({ preventScroll: true });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const current = MARKETPLACE_CATEGORIES.findIndex((item) => item.id === value);
    const next = MARKETPLACE_CATEGORIES[(current + step + MARKETPLACE_CATEGORIES.length) % MARKETPLACE_CATEGORIES.length];
    if (next) select(next.id, true);
  };

  return (
    <div
      aria-label="Categorías"
      className="nav-scroll -mx-1 flex gap-3 overflow-x-auto px-1 pb-3"
      onKeyDown={onKeyDown}
      ref={railRef}
      role="group"
    >
      {MARKETPLACE_CATEGORIES.map((item, index) => (
        <CategoryTile
          id={item.id}
          index={index}
          key={item.id}
          label={item.label}
          onSelect={() => select(item.id)}
          selected={value === item.id}
        />
      ))}
    </div>
  );
}
