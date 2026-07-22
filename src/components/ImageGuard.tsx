import { useEffect } from "react";

/**
 * Soft site-wide deterrent: block right-click / drag on images.
 * Does not stop DevTools or screenshots.
 */
export default function ImageGuard() {
  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      const t = e.target;
      if (t instanceof HTMLImageElement) e.preventDefault();
      if (t instanceof Element && t.closest("picture, .protected-img, [data-protected-media]")) {
        e.preventDefault();
      }
    };
    const onDragStart = (e: DragEvent) => {
      const t = e.target;
      if (t instanceof HTMLImageElement) e.preventDefault();
    };
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);
    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
