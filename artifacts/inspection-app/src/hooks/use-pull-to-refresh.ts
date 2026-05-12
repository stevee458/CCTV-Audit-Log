import { useRef, useEffect, useCallback } from "react";

const THRESHOLD = 72;
const MAX_PULL = 120;

interface UsePullToRefreshOptions {
  onRefresh?: (() => Promise<void> | void) | undefined;
  isRefreshing: boolean;
  indicatorRef: React.RefObject<HTMLElement | null>;
}

export function usePullToRefresh({
  onRefresh,
  isRefreshing,
  indicatorRef,
}: UsePullToRefreshOptions) {
  const startYRef = useRef<number | null>(null);
  const pullDistanceRef = useRef(0);
  const isRefreshingRef = useRef(isRefreshing);

  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
    if (!isRefreshing) {
      resetIndicator();
    }
  }, [isRefreshing]);

  const resetIndicator = useCallback(() => {
    const indicator = indicatorRef.current;
    if (!indicator) return;
    indicator.style.transform = "translateY(-100%)";
    indicator.style.opacity = "0";
    indicator.style.transition = "transform 0.3s ease, opacity 0.3s ease";
    pullDistanceRef.current = 0;
    startYRef.current = null;
  }, [indicatorRef]);

  useEffect(() => {
    if (!onRefresh) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) return;
      startYRef.current = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshingRef.current) return;
      if (startYRef.current === null) return;
      if (window.scrollY > 0) {
        startYRef.current = null;
        return;
      }

      const deltaY = e.touches[0].clientY - startYRef.current;
      if (deltaY <= 0) return;

      e.preventDefault();

      const pull = Math.min(deltaY * 0.5, MAX_PULL);
      pullDistanceRef.current = pull;

      const indicator = indicatorRef.current;
      if (!indicator) return;
      indicator.style.transition = "none";
      const progress = Math.min(pull / THRESHOLD, 1);
      indicator.style.transform = `translateY(${pull - 100}%)`;
      indicator.style.opacity = String(progress);
    };

    const handleTouchEnd = async () => {
      if (startYRef.current === null) return;

      if (pullDistanceRef.current >= THRESHOLD && !isRefreshingRef.current) {
        const indicator = indicatorRef.current;
        if (indicator) {
          indicator.style.transition = "transform 0.2s ease";
          indicator.style.transform = "translateY(0%)";
          indicator.style.opacity = "1";
        }
        startYRef.current = null;
        pullDistanceRef.current = 0;
        await onRefresh();
      } else {
        resetIndicator();
      }
    };

    const handleTouchCancel = () => {
      resetIndicator();
    };

    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    document.addEventListener("touchcancel", handleTouchCancel, { passive: true });

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [indicatorRef, onRefresh, resetIndicator]);
}
