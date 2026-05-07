import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function CookedHistoryShortcutIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <g transform="translate(12 12) scale(1.17) translate(-12 -12)">
        <circle cx="12" cy="12" r="5.8" strokeWidth={1.6} {...roundedIconStrokeProps} />
        <path d="M12 8.7v3.6l2.3 1.7" strokeWidth={1.6} {...roundedIconStrokeProps} />
      </g>
    </IconFrame>
  );
}
