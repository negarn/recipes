import { IconFrame, type IconProps } from './IconFrame';

export function EllipsisIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <circle cx="6.5" cy="12" r="1.45" fill="currentColor" />
      <circle cx="12" cy="12" r="1.45" fill="currentColor" />
      <circle cx="17.5" cy="12" r="1.45" fill="currentColor" />
    </IconFrame>
  );
}
