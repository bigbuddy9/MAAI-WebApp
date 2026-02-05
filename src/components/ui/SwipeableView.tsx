'use client';

import React, { useRef, useCallback, useEffect, useLayoutEffect } from 'react';

interface SwipeableViewProps {
  children: React.ReactNode;
  prevContent?: React.ReactNode;
  nextContent?: React.ReactNode;
  onSwipePrev: () => void;
  onSwipeNext: () => void;
  swipeKey: string | number;
  disabled?: boolean;
}

export function SwipeableView({
  children,
  prevContent,
  nextContent,
  onSwipePrev,
  onSwipeNext,
  swipeKey,
  disabled = false,
}: SwipeableViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const drag = useRef({
    startX: 0,
    startY: 0,
    active: false,
    decided: false,
    horizontal: false,
    offset: 0,
    animating: false,
  });

  const cbRef = useRef({ onSwipePrev, onSwipeNext });
  cbRef.current = { onSwipePrev, onSwipeNext };

  const contentRef = useRef({ hasPrev: !!prevContent, hasNext: !!nextContent });
  contentRef.current = { hasPrev: !!prevContent, hasNext: !!nextContent };

  const applyTransform = useCallback((px: number, animate: boolean) => {
    const t = animate ? 'transform 0.3s ease-out' : 'none';
    if (currentRef.current) {
      currentRef.current.style.transform = `translateX(${px}px)`;
      currentRef.current.style.transition = t;
    }
    if (prevRef.current) {
      prevRef.current.style.transform = `translateX(calc(-100% + ${px}px))`;
      prevRef.current.style.transition = t;
    }
    if (nextRef.current) {
      nextRef.current.style.transform = `translateX(calc(100% + ${px}px))`;
      nextRef.current.style.transition = t;
    }
    drag.current.offset = px;
  }, []);

  // Reset position on key change (before paint)
  useLayoutEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    drag.current.animating = false;
    applyTransform(0, false);
  }, [swipeKey, applyTransform]);

  const disabledRef = useRef(disabled);
  disabledRef.current = disabled;

  const handleStart = useCallback((x: number, y: number) => {
    if (disabledRef.current) return;
    if (drag.current.animating) return;
    drag.current.startX = x;
    drag.current.startY = y;
    drag.current.active = true;
    drag.current.decided = false;
    drag.current.horizontal = false;
  }, []);

  const handleMove = useCallback((x: number, y: number, nativeEvent?: Event) => {
    const d = drag.current;
    if (!d.active || d.animating) return;

    if (!d.decided) {
      const dx = Math.abs(x - d.startX);
      const dy = Math.abs(y - d.startY);
      if (dx + dy > 10) {
        d.decided = true;
        d.horizontal = dx > dy;
        if (d.horizontal && containerRef.current) {
          containerRef.current.style.cursor = 'grabbing';
          containerRef.current.style.userSelect = 'none';
        }
      }
      return;
    }

    if (!d.horizontal) return;

    if (nativeEvent) nativeEvent.preventDefault();

    let delta = x - d.startX;
    if (delta > 0 && !contentRef.current.hasPrev) delta *= 0.15;
    if (delta < 0 && !contentRef.current.hasNext) delta *= 0.15;

    applyTransform(delta, false);
  }, [applyTransform]);

  const handleEnd = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;

    if (containerRef.current) {
      containerRef.current.style.cursor = '';
      containerRef.current.style.userSelect = '';
    }

    if (!d.decided || !d.horizontal) return;

    const width = containerRef.current?.offsetWidth || 300;
    const threshold = width * 0.2;

    if (d.offset > threshold && contentRef.current.hasPrev) {
      d.animating = true;
      applyTransform(width, true);
      timeoutRef.current = setTimeout(() => {
        d.animating = false;
        timeoutRef.current = null;
        cbRef.current.onSwipePrev();
      }, 300);
    } else if (d.offset < -threshold && contentRef.current.hasNext) {
      d.animating = true;
      applyTransform(-width, true);
      timeoutRef.current = setTimeout(() => {
        d.animating = false;
        timeoutRef.current = null;
        cbRef.current.onSwipeNext();
      }, 300);
    } else {
      d.animating = true;
      applyTransform(0, true);
      timeoutRef.current = setTimeout(() => {
        d.animating = false;
        timeoutRef.current = null;
      }, 300);
    }
  }, [applyTransform]);

  // Native touch listeners (passive: false for preventDefault)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchMove = (e: TouchEvent) => {
      handleMove(e.touches[0].clientX, e.touches[0].clientY, e);
    };
    const onTouchEnd = () => handleEnd();

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [handleStart, handleMove, handleEnd]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const panelBase: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    overflowY: 'auto',
    pointerEvents: 'none',
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        overflow: 'hidden',
        flex: 1,
        minHeight: 0,
      }}
      onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
      onMouseMove={(e) => { if (drag.current.active) handleMove(e.clientX, e.clientY); }}
      onMouseUp={handleEnd}
      onMouseLeave={() => { if (drag.current.active) handleEnd(); }}
    >
      {prevContent && (
        <div ref={prevRef} style={{ ...panelBase, transform: 'translateX(-100%)' }}>
          <div key={`prev-${swipeKey}`}>{prevContent}</div>
        </div>
      )}

      <div ref={currentRef} style={{ width: '100%', height: '100%', overflowY: 'auto' }}>
        <div key={`current-${swipeKey}`}>{children}</div>
      </div>

      {nextContent && (
        <div ref={nextRef} style={{ ...panelBase, transform: 'translateX(100%)' }}>
          <div key={`next-${swipeKey}`}>{nextContent}</div>
        </div>
      )}
    </div>
  );
}
