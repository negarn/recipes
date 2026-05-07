import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

type CloseIconProps = IconProps & {
  strokeWidth?: number;
};

export function CloseIcon({
  className,
  strokeWidth = 1.8
}: CloseIconProps) {
  return (
    <IconFrame className={className}>
      <path d="m8 8 8 8" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
      <path d="m16 8-8 8" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
