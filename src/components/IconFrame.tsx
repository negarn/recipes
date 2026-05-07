import type { ReactNode } from 'react';
import { cn } from '../helpers/uiClasses';

export type IconProps = {
  className?: string;
};

export const roundedIconStrokeProps = {
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const
};

export function IconFrame({
  children,
  className
}: IconProps & {
  children: ReactNode;
}) {
  const frameClassName = className ?? 'size-full';

  return (
    <svg
      className={cn(frameClassName)}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      {children}
    </svg>
  );
}
