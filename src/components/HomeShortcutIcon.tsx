import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function HomeShortcutIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path
        d="M6.2 5.2h9.7a1.9 1.9 0 0 1 1.9 1.9v11.7H7.4a1.9 1.9 0 0 1-1.9-1.9V6.1a.9.9 0 0 1 .7-.9Z"
        strokeWidth={1.6}
        {...roundedIconStrokeProps}
      />
      <path d="M7.4 18.8a1.9 1.9 0 0 1 0-3.8h10.4" strokeWidth={1.6} {...roundedIconStrokeProps} />
      <path d="M9.2 8.8h6.1" strokeWidth={1.55} {...roundedIconStrokeProps} />
      <path d="M9.2 11.5h5.1" strokeWidth={1.55} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
