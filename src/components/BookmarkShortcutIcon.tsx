import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function BookmarkShortcutIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path
        d="M6.8 4.8h10.4a1.4 1.4 0 0 1 1.4 1.4v13l-6.6-4-6.6 4v-13a1.4 1.4 0 0 1 1.4-1.4Z"
        fill="none"
        strokeWidth={1.65}
        {...roundedIconStrokeProps}
      />
    </IconFrame>
  );
}
