export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const pageShellClass =
  'relative mx-auto max-w-[1620px] px-4 py-5 min-[720px]:px-8 min-[720px]:py-8';

export const tabbedPageShellClass =
  'relative mx-auto min-h-[100dvh] -mt-6 max-w-[1620px] overflow-x-hidden bg-app-soft-stone-strong px-4 pb-0 min-[720px]:-mt-6 min-[720px]:px-8 min-[720px]:pb-8';

const panelFrameClass =
  'relative overflow-hidden rounded-[28px] min-[720px]:rounded-[36px] border border-app-line shadow-[0_28px_70px_rgba(31,64,54,0.14)] backdrop-blur-[22px]';
const contentPanelSurfaceClass =
  'border-app-line-strong bg-app-surface-strong shadow-[0_18px_40px_rgba(31,64,54,0.1)]';
const tabbedPanelSurfaceClass =
  'bg-app-surface-strong';

export const contentPanelClass = cn(
  panelFrameClass,
  contentPanelSurfaceClass,
  'p-[1.1rem] min-[720px]:p-6'
);

export const tabbedPanelWrapClass = 'relative pt-[2.55rem] min-[720px]:pt-[3.05rem]';

export const tabbedPanelClass = cn(
  panelFrameClass,
  tabbedPanelSurfaceClass,
  'z-10 min-h-[calc(100dvh-2rem)] w-full overflow-visible px-[1.1rem] py-[1.1rem] shadow-none min-[720px]:min-h-[calc(100dvh-7.05rem)] min-[720px]:rounded-tl-none min-[720px]:px-[1.85rem] min-[720px]:pt-[1.45rem] min-[720px]:pb-3 min-[720px]:shadow-[0_28px_70px_rgba(31,64,54,0.14)]'
);

export const tabbedNavigationClass = 'absolute left-0 top-[-1rem] min-[720px]:top-0';

export const displayHeadingClass = 'font-display font-semibold';

export const pageTitleClass = cn(
  displayHeadingClass,
  'm-0 text-[clamp(1.9rem,3.8vw,3rem)] leading-[0.94] tracking-[-0.05em]'
);

export const sectionTitleClass =
  'm-0 font-display text-[clamp(1.55rem,3vw,2.15rem)] font-semibold tracking-[-0.03em]';

export const surfaceSectionTitleClass = cn(
  displayHeadingClass,
  'm-0 text-[1.45rem] leading-[1.04] tracking-[-0.04em]'
);

export const heroTextClass = 'mt-3 max-w-[46rem] text-[1.05rem] text-app-muted';

export const metaLabelClass =
  'text-[0.74rem] font-bold uppercase tracking-[0.16em] text-app-muted';

export const subheadingLabelClass =
  'm-0 text-[0.94rem] leading-[1.12] font-semibold uppercase tracking-[0.06em] text-app-muted min-[720px]:text-[1.02rem]';

export const subheadingChipClass =
  'inline-flex w-fit items-center rounded-full border border-app-brand bg-app-button-tint-hover px-3 py-1.5 !text-app-ink shadow-[0_6px_12px_rgba(31,64,54,0.08)]';

const pillControlBaseClass =
  'inline-flex items-center justify-center rounded-full border border-app-brand-strong bg-app-brand-strong px-[0.86rem] py-[0.56rem] font-bold text-app-on-accent transition focus-visible:outline-none';

export const pillButtonClass =
  `${pillControlBaseClass} enabled:cursor-pointer enabled:hover:-translate-y-px enabled:hover:brightness-[1.05] enabled:hover:shadow-[0_10px_22px_rgba(31,64,54,0.14)] enabled:focus-visible:-translate-y-px enabled:focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.14)] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none`;

const pillDangerControlBaseClass =
  'inline-flex items-center justify-center rounded-full border px-[0.86rem] py-[0.56rem] font-bold transition focus-visible:outline-none';

export const pillDangerButtonClass =
  `${pillDangerControlBaseClass} border-app-danger-line bg-app-danger-action-soft text-app-danger shadow-[0_10px_22px_rgba(102,47,34,0.1)] enabled:cursor-pointer enabled:hover:-translate-y-px enabled:hover:bg-app-danger-action-soft-hover enabled:hover:shadow-[0_14px_24px_rgba(102,47,34,0.14)] enabled:focus-visible:-translate-y-px enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_14px_24px_rgba(102,47,34,0.14)] disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none`;

export const pillLinkClass =
  `${pillControlBaseClass} cursor-pointer hover:-translate-y-px hover:brightness-[1.05] hover:shadow-[0_10px_22px_rgba(31,64,54,0.14)] focus-visible:-translate-y-px focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.14)]`;

const iconControlBaseClass =
  'inline-flex items-center justify-center rounded-full border border-app-line-strong bg-app-surface-tint text-app-brand-strong transition focus-visible:outline-none';

export const iconButtonClass =
  `${iconControlBaseClass} enabled:cursor-pointer enabled:hover:-translate-y-px enabled:hover:bg-app-button-tint enabled:hover:shadow-[0_10px_22px_rgba(31,64,54,0.08)] enabled:focus-visible:-translate-y-px enabled:focus-visible:bg-app-button-tint enabled:focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.08)] disabled:cursor-default disabled:opacity-45 disabled:shadow-none`;

const iconLinkClass =
  `${iconControlBaseClass} cursor-pointer hover:-translate-y-px hover:bg-app-button-tint hover:shadow-[0_10px_22px_rgba(31,64,54,0.08)] focus-visible:-translate-y-px focus-visible:bg-app-button-tint focus-visible:shadow-[0_10px_22px_rgba(31,64,54,0.08)]`;

export const circleBackLinkClass = cn(
  iconLinkClass,
  'size-[2.65rem] min-[720px]:size-[2.9rem] bg-app-surface-tint text-[1.3rem] leading-none'
);

export const chipClass =
  'inline-flex items-center rounded-full border border-app-field-border bg-app-surface-tint px-[0.82rem] py-[0.42rem] text-[0.86rem] font-bold text-app-brand-strong shadow-[0_8px_18px_rgba(31,64,54,0.05)]';

export const cardTagChipClass =
  '!border-app-card-accent-line !bg-app-meal-day-chip !font-semibold text-app-ink-soft shadow-none';

export const surfaceCardClass =
  'rounded-[24px] border border-app-line-strong bg-app-surface-strong shadow-[0_14px_30px_rgba(31,64,54,0.08)]';

export const surfaceSectionCardClass = cn(surfaceCardClass, 'p-5');

export const surfaceListItemCardClass =
  'rounded-[20px] border border-app-line bg-app-surface p-4 shadow-[0_10px_24px_rgba(31,64,54,0.04)]';

export const alertPillClass =
  'inline-flex rounded-full bg-app-danger-soft px-[0.78rem] py-[0.38rem] text-[0.74rem] font-semibold text-app-danger';
export const emptyStateTextClass = 'm-0 text-[0.9rem] leading-[1.5] text-app-muted';

const elevatedIconActionButtonBaseClass =
  'inline-flex items-center justify-center rounded-full transition focus-visible:outline-none enabled:cursor-pointer enabled:hover:-translate-y-px enabled:focus-visible:-translate-y-px disabled:cursor-default disabled:opacity-45 disabled:shadow-none';

export const elevatedBrandIconActionButtonClass =
  `${elevatedIconActionButtonBaseClass} border border-app-brand-strong bg-app-brand-strong text-app-on-accent shadow-[0_12px_24px_rgba(31,64,54,0.14)] enabled:hover:brightness-[1.05] enabled:hover:shadow-[0_18px_30px_rgba(31,64,54,0.2)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_18px_30px_rgba(31,64,54,0.2)]`;

export const elevatedAccentIconActionButtonClass =
  `${elevatedIconActionButtonBaseClass} border border-app-line bg-app-button-surface text-app-accent shadow-[0_10px_22px_rgba(22,32,25,0.08)] enabled:hover:bg-app-button-surface-hover enabled:hover:shadow-[0_16px_28px_rgba(22,32,25,0.12)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_16px_28px_rgba(22,32,25,0.12)]`;

export const cardAddIconActionButtonClass =
  `${elevatedIconActionButtonBaseClass} border border-app-card-accent bg-app-card-accent text-app-on-accent shadow-[0_12px_24px_rgba(31,64,54,0.14)] enabled:hover:brightness-[1.05] enabled:hover:shadow-[0_18px_30px_rgba(31,64,54,0.2)] enabled:focus-visible:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_18px_30px_rgba(31,64,54,0.2)]`;

export const inlineErrorTextClass = 'm-0 text-[0.82rem] text-app-danger';
export const inlineSuccessTextClass = 'm-0 text-[0.82rem] text-app-brand-strong';

export const fieldClass =
  'min-h-[3.15rem] w-full appearance-none rounded-[18px] border border-app-field-border bg-app-field px-[1rem] py-[0.8rem] text-app-ink shadow-[0_10px_24px_rgba(31,64,54,0.05)] transition placeholder:text-app-placeholder placeholder:opacity-100 focus:border-app-field-border-strong focus:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_14px_28px_rgba(31,64,54,0.08)] focus:outline-none';

export const textareaClass =
  'min-h-32 w-full resize-y rounded-[22px] border border-app-field-border bg-app-field px-[1.05rem] py-4 text-app-ink shadow-[0_10px_24px_rgba(31,64,54,0.04)] transition placeholder:text-app-placeholder placeholder:opacity-100 focus:border-app-field-border-strong focus:shadow-[0_0_0_4px_var(--color-app-focus-ring),0_14px_28px_rgba(31,64,54,0.06)] focus:outline-none';
