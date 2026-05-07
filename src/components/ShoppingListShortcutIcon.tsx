import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

export function ShoppingListShortcutIcon({ className }: IconProps) {
  return (
    <IconFrame className={className}>
      <path d="M5.2 6.7h1.8l1.7 7.4h7.6l1.9-5.2H8.1" strokeWidth={1.6} {...roundedIconStrokeProps} />
      <path d="M9.8 17.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" strokeWidth={1.6} {...roundedIconStrokeProps} />
      <path d="M16 17.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z" strokeWidth={1.6} {...roundedIconStrokeProps} />
    </IconFrame>
  );
}
