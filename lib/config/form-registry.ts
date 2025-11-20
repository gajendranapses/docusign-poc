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
}

// Map of form IDs to their file paths
export const FORM_REGISTRY: Record<string, FormConfig> = {
  'ey-checking-account-application': {
    id: 'ey-checking-account-application',
    name: 'EY Checking Account Application',
    path: path.join(process.cwd(), 'client-forms', 'ey-checking-account-application.pdf'),
    isInteractive: true,
  },
  // Add more forms here as needed
};

export function getFormById(formId: string): FormConfig | undefined {
  return FORM_REGISTRY[formId];
}

export function getAllForms(): FormConfig[] {
  return Object.values(FORM_REGISTRY);
}
