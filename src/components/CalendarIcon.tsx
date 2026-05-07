import {
  IconFrame,
  roundedIconStrokeProps,
  type IconProps
} from './IconFrame';

type CalendarIconProps = IconProps & {
  strokeWidth?: number;
};

export function CalendarIconGlyph({ strokeWidth = 1.65 }: { strokeWidth?: number }) {
  return (
    <>
      <path d="M7.2 4.8v2.5" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
      <path d="M16.8 4.8v2.5" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
      <path d="M5 8.1h14" strokeWidth={strokeWidth} {...roundedIconStrokeProps} />
      <rect
        x="4.5"
        y="5.8"
        width="15"
        height="13.7"
        rx="3.1"
        strokeWidth={strokeWidth}
        {...roundedIconStrokeProps}
      />
    </>
  );
}

export function CalendarIcon({
  className,
  strokeWidth = 1.65
}: CalendarIconProps) {
  return (
    <IconFrame className={className}>
      <CalendarIconGlyph strokeWidth={strokeWidth} />
    </IconFrame>
  );
}
