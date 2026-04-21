
export enum StructureType {
  MINISTRY = 'MINISTRY',
  BANK = 'BANK',
  CUSTOMS = 'CUSTOMS'
}

export interface InternalStructure {
  id: number;
  type: StructureType;
  officialName: string;
  code: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}