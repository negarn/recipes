import { IconFrame, roundedIconStrokeProps, type IconProps } from './IconFrame';

type ChevronIconProps = IconProps & {
  direction?: 'left' | 'right';
  strokeWidth?: number;
};

export function ChevronIcon({
  className,
  direction = 'left',
  strokeWidth = 1.9
}: ChevronIconProps) {
  return (
    <IconFrame className={className}>
      <path
        d="M14.8 6.5 9.2 12l5.6 5.5"
        transform={direction === 'right' ? 'rotate(180 12 12)' : undefined}
        strokeWidth={strokeWidth}
        {...roundedIconStrokeProps}
      />
    </IconFrame>
  );
}
