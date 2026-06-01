import { IconFrame, roundedIconStrokeProps, type IconProps } from './IconFrame';

type ChevronIconProps = IconProps & {
  direction?: 'down' | 'left' | 'right' | 'up';
  strokeWidth?: number;
};

const chevronTransforms = {
  down: 'rotate(-90 12 12)',
  left: undefined,
  right: 'rotate(180 12 12)',
  up: 'rotate(90 12 12)'
} satisfies Record<NonNullable<ChevronIconProps['direction']>, string | undefined>;

export function ChevronIcon({
  className,
  direction = 'left',
  strokeWidth = 1.9
}: ChevronIconProps) {
  return (
    <IconFrame className={className}>
      <path
        d="M14.8 6.5 9.2 12l5.6 5.5"
        transform={chevronTransforms[direction]}
        strokeWidth={strokeWidth}
        {...roundedIconStrokeProps}
      />
    </IconFrame>
  );
}
