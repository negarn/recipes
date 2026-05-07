import { CalendarIconGlyph } from './CalendarIcon';
import { IconFrame, type IconProps } from './IconFrame';

function formatMealPlanIconCount(value: number) {
  if (value > 9) {
    return '9+';
  }

  return String(value);
}

export function MealPlanShortcutIcon({
  className,
  plannedMealCount = 0
}: IconProps & {
  plannedMealCount?: number;
}) {
  const countLabel = formatMealPlanIconCount(plannedMealCount);
  const countFontSize = countLabel.length > 1 ? '7.2' : '8.8';

  return (
    <IconFrame className={className}>
      <CalendarIconGlyph />
      <text
        x="12"
        y="14.4"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={countFontSize}
        fontWeight="700"
        fill="currentColor"
      >
        {countLabel}
      </text>
    </IconFrame>
  );
}
