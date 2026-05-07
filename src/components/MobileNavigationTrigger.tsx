import { CloseIcon } from './CloseIcon';
import { IconActionButton } from './IconActionButton';
import { MenuIcon } from './MenuIcon';
import { cn } from '../helpers/uiClasses';
import { useMobileNavigation } from './MobileNavigationContext';

export function MobileNavigationTrigger({ className }: { className?: string }) {
  const { isMobileMenuOpen, mobileMenuId, toggleMobileMenu } = useMobileNavigation();

  return (
    <IconActionButton
      className={cn(
        'size-[2rem]',
        '!rounded-full',
        '!border-app-field-border',
        '!bg-app-meal-row',
        '!shadow-[0_8px_18px_rgba(31,64,54,0.05)]',
        'enabled:hover:!bg-app-button-tint',
        'enabled:hover:!shadow-[0_12px_22px_rgba(31,64,54,0.08)]',
        'enabled:focus-visible:!bg-app-button-tint',
        'enabled:focus-visible:!shadow-[0_0_0_4px_var(--color-app-focus-ring),0_12px_22px_rgba(31,64,54,0.08)]',
        className
      )}
      onClick={toggleMobileMenu}
      label={isMobileMenuOpen ? 'Close navigation sidebar' : 'Open navigation sidebar'}
      aria-controls={mobileMenuId}
      aria-expanded={isMobileMenuOpen}
      aria-haspopup="dialog"
    >
      {isMobileMenuOpen ? (
        <CloseIcon className="size-[1.25rem]" />
      ) : (
        <MenuIcon className="size-[1.25rem]" />
      )}
    </IconActionButton>
  );
}
