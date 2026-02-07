import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CRMMobileSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
  showCloseButton?: boolean;
  maxHeight?: string;
}

export function CRMMobileSheet({
  open,
  onClose,
  title,
  children,
  className,
  showCloseButton = true,
  maxHeight = '88dvh',
}: CRMMobileSheetProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop - iOS scroll lock */}
      <div
        className={cn(
          "fixed inset-0 z-[1000] bg-black/30 transition-opacity duration-300",
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        onTouchMove={(e) => e.preventDefault()}
        style={{ touchAction: 'none' }}
      />

      {/* Bottom Sheet */}
      <div 
        className={cn(
          "fixed inset-x-0 bottom-0 z-[1001] flex justify-center pointer-events-none"
        )}
      >
        <div
          className={cn(
            "w-full max-w-md bg-background rounded-t-3xl shadow-2xl pointer-events-auto overflow-hidden",
            "transform transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
            open ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0',
            className
          )}
          style={{ maxHeight }}
        >
          {/* Drag Handle */}
          <div className="flex justify-center py-3">
            <div className="h-1.5 w-12 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header with title and close button */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 pb-4">
              {title && (
                <h2 className="text-xl font-semibold">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="h-8 w-8 rounded-full bg-muted flex items-center justify-center active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Content */}
          <div
            className="overflow-y-auto px-6 pb-6"
            style={{
              WebkitOverflowScrolling: 'touch',
              maxHeight: `calc(${maxHeight} - 80px)`,
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
