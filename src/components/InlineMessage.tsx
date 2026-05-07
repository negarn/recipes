import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  cn,
  inlineErrorTextClass,
  inlineSuccessTextClass
} from '../helpers/uiClasses';

export function InlineMessage({
  children,
  className,
  tone = 'error',
  ...paragraphProps
}: {
  children: ReactNode;
  className?: string;
  tone?: 'error' | 'success';
} & ComponentPropsWithoutRef<'p'>) {
  const isError = tone === 'error';

  return (
    <p
      {...paragraphProps}
      className={cn(
        isError ? inlineErrorTextClass : inlineSuccessTextClass,
        className
      )}
      role={isError ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
