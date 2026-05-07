import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function SearchFieldIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <circle cx="10.2" cy="10.2" r="6.8" strokeWidth={1.8} {...roundedIconStrokeProps} />
      <path d="m15.2 15.2 4.8 4.8" strokeWidth={1.8} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
