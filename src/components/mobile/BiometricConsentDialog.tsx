// First-time biometric consent dialog
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Fingerprint, ScanFace } from 'lucide-react';
import { type BiometricResult, getBiometryTypeName } from '@/lib/biometrics';

interface BiometricConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEnable: () => void;
  onSkip: () => void;
  biometricInfo: BiometricResult | null;
}

export function BiometricConsentDialog({
  open,
  onOpenChange,
  onEnable,
  onSkip,
  biometricInfo,
}: BiometricConsentDialogProps) {
  const isFaceId = biometricInfo?.biometryType === 'face';
  const biometryName = biometricInfo ? getBiometryTypeName(biometricInfo.biometryType) : 'Biometric';

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-sm mx-4">
        <AlertDialogHeader className="items-center text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            {isFaceId ? (
              <ScanFace className="w-8 h-8 text-primary" />
            ) : (
              <Fingerprint className="w-8 h-8 text-primary" />
            )}
          </div>
          <AlertDialogTitle className="text-xl">
            Enable biometric login?
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Log in faster using {biometryName.toLowerCase() === 'biometric' 
              ? 'fingerprint or Face ID' 
              : biometryName}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <AlertDialogAction
            onClick={onEnable}
            className="w-full py-5 text-base rounded-full"
          >
            Enable
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onSkip}
            className="w-full py-5 text-base rounded-full border-0 bg-transparent hover:bg-muted"
          >
            Not now
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
