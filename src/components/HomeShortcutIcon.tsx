import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function HomeShortcutIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path d="M4.8 10.5 12 4.4l7.2 6.1" strokeWidth={1.7} {...roundedIconStrokeProps} />
      <path d="M6.7 9.9v8.7h10.6V9.9" strokeWidth={1.7} {...roundedIconStrokeProps} />
      <path d="M10 18.6v-4.5h4v4.5" strokeWidth={1.7} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
