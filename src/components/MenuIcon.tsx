import { IconFrame, roundedIconStrokeProps, type IconProps } from './IconFrame';

export function MenuIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path d="M4.8 7.2h14.4" strokeWidth={1.8} {...roundedIconStrokeProps} />
      <path d="M4.8 12h14.4" strokeWidth={1.8} {...roundedIconStrokeProps} />
      <path d="M4.8 16.8h14.4" strokeWidth={1.8} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
