import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function SettingsShortcutIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <g transform="translate(12 12) scale(0.82) translate(-12 -12)">
        <path
          d="M9.2 3.4h5.6l.42 2.12c.44.17.86.4 1.25.68l2.04-.76 2.8 4.84-1.62 1.42c.04.2.06.4.06.6s-.02.4-.06.6l1.62 1.42-2.8 4.84-2.04-.76c-.39.28-.81.51-1.25.68l-.42 2.12H9.2l-.42-2.12a5.8 5.8 0 0 1-1.25-.68l-2.04.76-2.8-4.84 1.62-1.42a3.12 3.12 0 0 1 0-1.2L2.69 10.3l2.8-4.84 2.04.76c.39-.28.81-.51 1.25-.68L9.2 3.4Z"
          fill="none"
          strokeWidth={1.55}
          {...roundedIconStrokeProps}
        />
        <circle
          cx="12"
          cy="12"
          r="2.65"
          fill="none"
          strokeWidth={1.55}
          {...roundedIconStrokeProps}
        />
      </g>
    </IconFrame>
  );
}
