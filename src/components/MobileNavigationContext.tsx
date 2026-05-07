import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode
} from 'react';

type MobileNavigationContextValue = {
  closeMobileMenu: () => void;
  isMobileMenuOpen: boolean;
  mobileMenuId: string;
  openMobileMenu: () => void;
  toggleMobileMenu: () => void;
};

const MobileNavigationContext = createContext<MobileNavigationContextValue | null>(null);

export function MobileNavigationProvider({ children }: { children: ReactNode }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mobileMenuId = useId();

  const openMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((currentValue) => !currentValue);
  }, []);

  return (
    <MobileNavigationContext.Provider
      value={{
        closeMobileMenu,
        isMobileMenuOpen,
        mobileMenuId,
        openMobileMenu,
        toggleMobileMenu
      }}
    >
      {children}
    </MobileNavigationContext.Provider>
  );
}

export function useMobileNavigation() {
  const context = useContext(MobileNavigationContext);

  if (context === null) {
    throw new Error('useMobileNavigation must be used within a MobileNavigationProvider.');
  }

  return context;
}
