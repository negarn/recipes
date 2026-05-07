import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

type CheckIconProps = IconProps & {
  strokeWidth?: number;
};

export function CheckIcon({
  className,
  strokeWidth = 1.9
}: CheckIconProps) {
  return (
    <IconFrame className={className}>
      <path
        d="m6.8 12.3 3.2 3.2 7.2-7.2"
        strokeWidth={strokeWidth}
        {...roundedIconStrokeProps}
      />
    </IconFrame>
  );
}
