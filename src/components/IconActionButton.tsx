import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn, iconButtonClass } from '../helpers/uiClasses';

type IconActionButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'aria-label' | 'children' | 'className' | 'type'
> & {
  children: ReactNode;
  className?: string;
  label: string;
  type?: 'button' | 'reset' | 'submit';
  useBaseStyles?: boolean;
};

export function IconActionButton({
  children,
  className,
  label,
  type = 'button',
  useBaseStyles = true,
  ...buttonProps
}: IconActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(useBaseStyles && iconButtonClass, className)}
      aria-label={label}
      {...buttonProps}
    >
      {children}
    </button>
  );
}
