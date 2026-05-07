import { IconFrame, roundedIconStrokeProps, type IconProps } from './IconFrame';

export function PlusIcon({
  className,
  strokeWidth = 1.85
}: IconProps & {
  strokeWidth?: number;
}) {
  return (
    <IconFrame className={className}>
      <path d="M12 7v10" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
      <path d="M7 12h10" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
