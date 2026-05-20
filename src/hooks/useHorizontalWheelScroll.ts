import { useEffect, type RefObject } from 'react';

/**
 * A hook that redirects vertical mouse wheel scroll to horizontal scroll
 * for a horizontally overflowed element.
 */
export function useHorizontalWheelScroll(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleWheel = (e: WheelEvent) => {
      const isScrollable = element.scrollWidth > element.clientWidth;
      if (!isScrollable) return;

      const absDeltaY = Math.abs(e.deltaY);
      const absDeltaX = Math.abs(e.deltaX);

      // Only redirect if vertical wheel scrolling is dominant
      if (absDeltaY >= absDeltaX && e.deltaY !== 0) {
        element.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    };

    element.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      element.removeEventListener('wheel', handleWheel);
    };
  }, [ref]);
}
