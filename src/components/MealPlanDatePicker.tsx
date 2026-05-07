import {
  addMonths,
  formatMealPlanMonthLabel,
  getMonthStart,
  parseLocalDateString
} from '../helpers/mealPlan';
import { ErrorPillMessage } from './PageStatusMessage';
import { ChevronIcon } from './ChevronIcon';
import { IconActionButton } from './IconActionButton';
import { formatDateAsLocalDateString } from '../helpers/mealPlanData';
import { cn } from '../helpers/uiClasses';

const weekdayLabels = [
  { id: 'mon', label: 'M' },
  { id: 'tue', label: 'T' },
  { id: 'wed', label: 'W' },
  { id: 'thu', label: 'T' },
  { id: 'fri', label: 'F' },
  { id: 'sat', label: 'S' },
  { id: 'sun', label: 'S' }
];

const fullDateFormatter = new Intl.DateTimeFormat('en-CA', { dateStyle: 'full' });

type CalendarDay =
  | {
      type: 'empty';
    }
  | {
      date: string;
      dateValue: Date;
      dayOfMonth: number;
      type: 'day';
    };

function getCalendarDays(visibleMonth: Date) {
  const monthStart = getMonthStart(visibleMonth);
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0
  ).getDate();
  const calendarDays: CalendarDay[] = Array.from({ length: firstWeekday }, () => ({
    type: 'empty'
  }));

  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
    const currentDate = new Date(
      monthStart.getFullYear(),
      monthStart.getMonth(),
      dayOfMonth
    );

    calendarDays.push({
      type: 'day',
      date: formatDateAsLocalDateString(currentDate),
      dateValue: currentDate,
      dayOfMonth
    });
  }

  while (calendarDays.length % 7) {
    calendarDays.push({ type: 'empty' });
  }

  return calendarDays;
}

export function MealPlanDatePicker({
  errorMessage,
  isSaving,
  minDate,
  onMonthChange,
  onSelectDate,
  selectDateLabelPrefix = 'Add for',
  visibleMonth
}: {
  errorMessage?: string | null;
  isSaving?: boolean;
  minDate: string;
  onMonthChange: (nextMonth: Date) => void;
  onSelectDate: (date: string) => void;
  selectDateLabelPrefix?: string;
  visibleMonth: Date;
}) {
  const visibleMonthStart = getMonthStart(visibleMonth);
  const minimumDate = parseLocalDateString(minDate) ?? new Date();
  const minimumDateTimestamp = minimumDate.getTime();
  const minimumMonthStart = getMonthStart(minimumDate);
  const todayDateString = formatDateAsLocalDateString(new Date());
  const todayDate = parseLocalDateString(todayDateString) ?? new Date();
  const todayDateTimestamp = todayDate.getTime();
  const isPreviousMonthDisabled =
    visibleMonthStart.getTime() <= minimumMonthStart.getTime();
  const calendarDays = getCalendarDays(visibleMonthStart);

  return (
    <div className="rounded-[22px] border border-app-line-strong bg-app-surface-strong p-3 shadow-[0_12px_26px_rgba(31,64,54,0.08)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={cn('m-0 font-display text-[1.05rem] font-semibold tracking-[-0.03em] text-app-ink')}>
            {formatMealPlanMonthLabel(visibleMonthStart)}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <IconActionButton
            className="size-[2rem] text-[1rem]"
            onClick={() => {
              onMonthChange(addMonths(visibleMonthStart, -1));
            }}
            disabled={isSaving || isPreviousMonthDisabled}
            label="Show previous month"
          >
            <ChevronIcon className="size-[1rem]" />
          </IconActionButton>
          <IconActionButton
            className="size-[2rem] text-[1rem]"
            onClick={() => {
              onMonthChange(addMonths(visibleMonthStart, 1));
            }}
            disabled={isSaving}
            label="Show next month"
          >
            <ChevronIcon direction="right" className="size-[1rem]" />
          </IconActionButton>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-[0.28rem]">
        {weekdayLabels.map(({ id, label }) => (
          <span
            key={id}
            className="flex h-[1.8rem] items-center justify-center text-[0.68rem] font-bold uppercase tracking-[0.08em] text-app-muted-soft"
          >
            {label}
          </span>
        ))}

        {calendarDays.map((calendarDay, index) => {
          if (calendarDay.type === 'empty') {
            return <span key={`empty-${index}`} className="block h-[2.2rem]" aria-hidden="true" />;
          }

          const calendarDateTimestamp = calendarDay.dateValue.getTime();
          const isDisabled = isSaving || calendarDateTimestamp < minimumDateTimestamp;
          const isToday = calendarDateTimestamp === todayDateTimestamp;

          return (
            <button
              key={calendarDay.date}
              type="button"
              className={cn(
                'flex h-[2.2rem] items-center justify-center rounded-full text-[0.88rem] font-semibold transition focus-visible:outline-none',
                isDisabled
                  ? 'cursor-not-allowed text-app-muted-soft/45'
                  : 'cursor-pointer bg-app-surface-soft text-app-brand-strong hover:-translate-y-px hover:bg-app-button-tint hover:shadow-[0_8px_18px_rgba(31,64,54,0.07)] focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring)]',
                isToday && !isDisabled && 'border border-app-line-strong bg-app-button-tint'
              )}
              onClick={() => {
                onSelectDate(calendarDay.date);
              }}
              disabled={isDisabled}
              aria-label={`${selectDateLabelPrefix} ${fullDateFormatter.format(calendarDay.dateValue)}`}
            >
              {calendarDay.dayOfMonth}
            </button>
          );
        })}
      </div>

      {errorMessage ? (
        <ErrorPillMessage className="mt-3">
          {errorMessage}
        </ErrorPillMessage>
      ) : null}
    </div>
  );
}
