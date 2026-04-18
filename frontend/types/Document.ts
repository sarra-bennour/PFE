export interface Document {
  id: number;
  fileName: string;
  documentType: string;
  status: string;
  uploadedAt: string;
  validatedAt?: string;
  fileType: string;
  filePath?: string;
  fileSize?: number;
  validationComment?: string;
  validatedBy?: string;
  downloadUrl?: string;  
}