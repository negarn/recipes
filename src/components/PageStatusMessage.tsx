import type { ReactNode } from 'react';
import {
  alertPillClass,
  cn,
  displayHeadingClass,
  emptyStateTextClass
} from '../helpers/uiClasses';

export function ErrorPillMessage({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn(alertPillClass, className)} role="alert">
      {children}
    </p>
  );
}

export function EmptyStateMessage({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <p className={cn(emptyStateTextClass, className)}>{children}</p>;
}

export function EmptyStateCard({
  description,
  title,
  className
}: {
  description: ReactNode;
  title: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        'rounded-[24px] border border-app-field-border bg-app-meal-row p-5 shadow-[0_12px_24px_rgba(31,64,54,0.06)] min-[720px]:p-6',
        className
      )}
      role="status"
    >
      <h2
        className={cn(
          displayHeadingClass,
          'm-0 text-[1.28rem] leading-[1.12] tracking-[-0.03em] text-app-ink'
        )}
      >
        {title}
      </h2>
      <p className="m-0 mt-2 text-[0.98rem] leading-[1.5] text-app-muted">{description}</p>
    </section>
  );
}
