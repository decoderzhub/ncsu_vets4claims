import React, { forwardRef } from 'react';
import useMobileViewport from '../../hooks/useMobileViewport';

interface Props {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const MobileShell = forwardRef<HTMLElement, Props>(({ header, footer, children, className = '' }, ref) => {
  useMobileViewport(ref as React.RefObject<HTMLElement>);

  return (
    <div
      className={`bg-gradient-to-br from-blue-50 via-white to-red-50 ${className}`}
      style={{
        position: 'fixed',
        inset: 0,
        height: 'var(--app-height)',
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="flex flex-col h-full w-full overflow-hidden">
        {/* Header */}
        {header && (
          <header className="shrink-0 sticky top-0 z-30">
            {header}
          </header>
        )}

        {/* Scrollable content area */}
        <main 
          ref={ref}
          key={header ? 'with-header' : 'no-header'}
          data-chat-scroller
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-gutter:stable]"
        >
          <div className="min-w-0 break-words w-full">
            {children}
          </div>
        </main>

        {/* Footer / Input bar, pinned to bottom with safe-area padding */}
        {footer && (
          <footer className="relative shrink-0 sticky bottom-0 z-30">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
});

MobileShell.displayName = 'MobileShell';

export default MobileShell;