import path from 'path';

export interface FieldPosition {
  page: number;
  x: number;
  y: number;
  fontSize?: number;
}

export interface StaticFormField {
  name: string;
  label: string;
  type: 'text' | 'checkbox' | 'signature' | 'date';
  position: FieldPosition;
  maxLength?: number;
}

export interface FormConfig {
  id: string;
  name: string;
  path: string;
  isInteractive: boolean; // true if PDF has form fields, false if static
  fields?: StaticFormField[]; // only for static PDFs
  fieldMapping?: Record<string, string>; // optional mapping: API field name -> PDF field name
}

// Map of form IDs to their file paths
export const FORM_REGISTRY: Record<string, FormConfig> = {
  'dcu-checking-savings-application': {
    id: 'dcu-checking-savings-application',
    name: 'DCU Checking and Savings Account Application',
    path: path.join(process.cwd(), 'client-forms', 'checking-and-savings-application.pdf'),
    isInteractive: true,
    fieldMapping: {
      // Account type - special handling for Individual 1/Joint 1 checkboxes
      accountType: 'accountType', // Will be handled specially in pdf-form-handler

      // Primary Owner Information
      primaryOwnerName: 'Primary Owners Name/Account Title',
      primaryOwnerSsn: 'Social Security or Tax ID #',

      // Secondary/Joint Owner Information
      secondaryOwnerFirstName: 'Legal First Name',
      secondaryOwnerMiddleName: 'Middle Initital_2',
      secondaryOwnerLastName: 'Last Name_2',
      secondaryOwnerDob: 'Date of Birth_2',
      secondaryOwnerSsn: 'SSN_2',
      secondaryOwnerOccupation: 'Occupation',
      secondaryOwnerAddress: 'Residential Address',
      secondaryOwnerCity: 'City_2',
      secondaryOwnerState: 'State_2',
      secondaryOwnerZip: 'Zip_2',

      // Secondary Owner Mailing Address
      secondaryOwnerMailingAddress: 'Mailing Address if different than residential address',
      secondaryOwnerMailingCity: 'City_3',
      secondaryOwnerMailingState: 'State_3',
      secondaryOwnerMailingZip: 'Zip_3',

      // Secondary Owner Contact
      secondaryOwnerHomePhone: 'Home phone',
      secondaryOwnerWorkPhone: 'Work phone',
      secondaryOwnerCellPhone: 'Cell phone',
      secondaryOwnerEmail: 'Email address',
    },
  },
};

export function getFormById(formId: string): FormConfig | undefined {
  return FORM_REGISTRY[formId];
}

export function getAllForms(): FormConfig[] {
  return Object.values(FORM_REGISTRY);
}
