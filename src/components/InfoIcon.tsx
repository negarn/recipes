import { IconFrame, roundedIconStrokeProps, type IconProps } from './IconFrame';
import { cn } from '../helpers/uiClasses';

type InfoIconProps = IconProps & {
  isActive?: boolean;
  strokeWidth?: number;
};

export function InfoIcon({
  className,
  isActive = false,
  strokeWidth = 1.55
}: InfoIconProps) {
  return (
    <IconFrame
      className={cn(
        'text-app-muted-soft/70 transition group-hover/source:text-app-brand-strong group-focus-within/source:text-app-brand-strong',
        isActive && 'text-app-brand-strong',
        className
      )}
    >
      <circle cx="12" cy="12" r="11.225" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
      <path
        d="M12 9.9v6.2"
        strokeWidth={strokeWidth}
        {...roundedIconStrokeProps}
      />
      <circle cx="12" cy="6.95" r="1.35" fill="currentColor" />
    </IconFrame>
  );
}
