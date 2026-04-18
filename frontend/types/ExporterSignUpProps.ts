export interface ExporterSignUpProps {
  onBack?: () => void;
  embedded?: boolean;
  onError?: (message: string) => void;
  onSuccess?: () => void;
}