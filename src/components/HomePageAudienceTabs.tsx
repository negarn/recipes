import { cn } from '../helpers/uiClasses';
import type { HomePageAudience } from '../helpers/homePageSearchParams';

const tabOptions: ReadonlyArray<{ label: string; value: HomePageAudience }> = [
  { label: 'Adults', value: 'adults' },
  { label: 'Children', value: 'children' }
];

function getTabClassName(isActive: boolean) {
  return cn(
    "flex h-full flex-1 cursor-pointer items-center justify-center rounded-full px-[0.95rem] text-center text-[0.86rem] font-semibold transition focus-visible:outline-none",
    isActive
      ? 'bg-app-brand-strong text-app-on-accent shadow-[0_10px_20px_rgba(31,64,54,0.18)]'
      : 'text-app-muted-soft hover:text-app-brand-strong focus-visible:text-app-brand-strong'
  );
}

export function HomePageAudienceTabs({
  audience,
  className,
  onAudienceChange
}: {
  audience: HomePageAudience;
  className?: string;
  onAudienceChange: (nextAudience: HomePageAudience) => void;
}) {
  return (
    <div className={className}>
      <div
        className="inline-flex h-[2.85rem] w-full items-center gap-1 rounded-full border border-app-field-border bg-app-button-surface p-1 min-[720px]:h-[3rem] min-[900px]:w-auto"
        role="tablist"
        aria-label="Recipe audience"
      >
        {tabOptions.map(({ label, value }) => {
          const isActive = audience === value;

          return (
            <button
              key={value}
              type="button"
              role="tab"
              className={getTabClassName(isActive)}
              aria-selected={isActive}
              onClick={() => {
                if (isActive) {
                  return;
                }

                onAudienceChange(value);
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
