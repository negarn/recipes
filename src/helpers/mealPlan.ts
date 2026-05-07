const localDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;

const mealPlanDayFormatter = new Intl.DateTimeFormat('en-CA', {
  weekday: 'short',
  month: 'long',
  day: 'numeric'
});

const mealPlanMonthFormatter = new Intl.DateTimeFormat('en-CA', {
  month: 'long',
  year: 'numeric'
});

export function parseLocalDateString(dateString: string) {
  const localDateMatch = dateString.match(localDatePattern);

  if (!localDateMatch) {
    return null;
  }

  const [, yearLabel, monthLabel, dayLabel] = localDateMatch;
  const year = Number(yearLabel);
  const month = Number(monthLabel);
  const day = Number(dayLabel);
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return parsedDate;
}

export function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function addMonths(date: Date, monthCount: number) {
  return new Date(date.getFullYear(), date.getMonth() + monthCount, 1);
}

export function formatMealPlanDayLabel(dateString: string) {
  const parsedDate = parseLocalDateString(dateString);
  return parsedDate ? mealPlanDayFormatter.format(parsedDate) : dateString;
}

export function formatMealPlanMonthLabel(date: Date) {
  return mealPlanMonthFormatter.format(getMonthStart(date));
}
