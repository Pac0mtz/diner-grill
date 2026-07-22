import type { ImgHTMLAttributes } from "react";

type Props = ImgHTMLAttributes<HTMLImageElement> & {
  /** When true, skip protection (e.g. admin uploads preview). */
  unprotected?: boolean;
};

/**
 * Site photos: discourages drag/save/context-menu copy.
 * Not a DRM guarantee — browsers can still capture screenshots.
 */
export default function ProtectedImg({
  unprotected = false,
  className = "",
  draggable,
  onContextMenu,
  onDragStart,
  alt = "",
  ...rest
}: Props) {
  if (unprotected) {
    return <img alt={alt} className={className} draggable={draggable} {...rest} />;
  }

  return (
    <img
      alt={alt}
      className={`protected-img ${className}`.trim()}
      draggable={false}
      onContextMenu={(e) => {
        e.preventDefault();
        onContextMenu?.(e);
      }}
      onDragStart={(e) => {
        e.preventDefault();
        onDragStart?.(e);
      }}
      {...rest}
    />
  );
}
