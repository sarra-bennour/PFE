import { RequestStatus } from '../types';

export interface Declaration {
  id: string;
  date: string;
  exporter: string;
  product: string;
  status: RequestStatus;
  ngp: string;
  value: string;
  weight?: string;
  origin?: string;
  transport?: string;
}

export interface ImporterTrackingProps {
  onModalOpen?: (isOpen: boolean, content?: React.ReactNode) => void;
}