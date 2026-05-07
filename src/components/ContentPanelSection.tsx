import type { ReactNode } from 'react';
import { cn, contentPanelClass, sectionTitleClass } from '../helpers/uiClasses';

type ContentPanelSectionProps = {
  actions?: ReactNode;
  as?: 'article' | 'section';
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  title: ReactNode;
  titleWrapClassName?: string;
};

export function ContentPanelSection({
  actions,
  as: Element = 'article',
  children,
  className,
  headerClassName,
  title,
  titleWrapClassName
}: ContentPanelSectionProps) {
  return (
    <Element className={cn(contentPanelClass, className)}>
      <div className={cn('mb-5', headerClassName)}>
        <div className={cn('min-w-0', titleWrapClassName)}>
          <h2 className={sectionTitleClass}>{title}</h2>
        </div>
        {actions}
      </div>
      {children}
    </Element>
  );
}
