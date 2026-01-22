import { useEffect, useState } from 'react';
import { Check, User, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface ExchangeSuccessSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerName: string;
  ownerPhotoUrl?: string;
  sharedBack: boolean;
}

export function ExchangeSuccessSheet({
  open,
  onOpenChange,
  ownerName,
  ownerPhotoUrl,
  sharedBack,
}: ExchangeSuccessSheetProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (open) {
      setVisible(true);
      setExiting(false);

      // Auto-dismiss after 4 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [open]);

  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      onOpenChange(false);
    }, 300);
  };

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/20 backdrop-blur-[2px] transition-opacity duration-300",
          exiting ? "opacity-0" : "opacity-100"
        )}
        onClick={handleClose}
      />

      {/* Bottom Sheet */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] transition-all duration-300 ease-out",
          exiting ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"
        )}
      >
        <div className="bg-card/98 backdrop-blur-xl rounded-2xl border border-border/40 shadow-[0_-10px_40px_rgba(0,0,0,0.12)] overflow-hidden">
          {/* Main Content */}
          <div className="p-5">
            <div className="flex items-center gap-4">
              {/* Success Icon with Photo */}
              <div className="relative flex-shrink-0">
                {ownerPhotoUrl ? (
                  <div className="relative">
                    <img
                      src={ownerPhotoUrl}
                      alt={ownerName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-primary/20"
                    />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                    </div>
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <Check className="h-7 w-7 text-primary" />
                  </div>
                )}
              </div>

              {/* Text Content */}
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">
                  Connected on Synka
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Contact saved to your CRM
                </p>
                {sharedBack && (
                  <p className="text-xs text-primary/80 mt-1">
                    ✓ Your card was shared back
                  </p>
                )}
              </div>

              {/* View CRM Link */}
              <Link
                to="/crm"
                onClick={handleClose}
                className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-muted/50 hover:bg-muted transition-colors"
              >
                <ArrowRight className="h-4 w-4 text-foreground/70" />
              </Link>
            </div>
          </div>

          {/* Progress Bar for Auto-dismiss */}
          <div className="h-1 bg-muted/30 overflow-hidden">
            <div
              className={cn(
                "h-full bg-primary/40 transition-all ease-linear",
                !exiting ? "animate-progress-shrink" : ""
              )}
              style={{
                animation: !exiting ? 'progressShrink 4s linear forwards' : 'none',
              }}
            />
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progressShrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </>
  );
}
