import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import { StaticFormField } from '@/lib/config/form-registry';

export interface FormFieldInfo {
  name: string;
  label?: string;
  type: 'text' | 'checkbox' | 'dropdown' | 'radio' | 'signature' | 'date' | 'unknown';
  value?: string | boolean;
  options?: string[]; // For dropdowns and radio groups
}

export interface FillFormFieldData {
  [fieldName: string]: string | boolean;
}

/**
 * Reads a PDF form and extracts all field information (for interactive PDFs)
 */
export async function getPdfFormFields(pdfPath: string): Promise<FormFieldInfo[]> {
  try {
    // Read the PDF file
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form
    const form = pdfDoc.getForm();
    const fields = form.getFields();

    const fieldInfos: FormFieldInfo[] = [];

    for (const field of fields) {
      const fieldName = field.getName();
      let fieldInfo: FormFieldInfo = {
        name: fieldName,
        type: 'unknown',
      };

      // Determine field type and extract relevant info
      if (field instanceof PDFTextField) {
        fieldInfo.type = 'text';
        fieldInfo.value = field.getText() || '';
      } else if (field instanceof PDFCheckBox) {
        fieldInfo.type = 'checkbox';
        fieldInfo.value = field.isChecked();
      } else if (field instanceof PDFDropdown) {
        fieldInfo.type = 'dropdown';
        fieldInfo.options = field.getOptions();
        const selected = field.getSelected();
        fieldInfo.value = selected && selected.length > 0 ? selected[0] : '';
      } else if (field instanceof PDFRadioGroup) {
        fieldInfo.type = 'radio';
        fieldInfo.options = field.getOptions();
        fieldInfo.value = field.getSelected() || '';
      }

      fieldInfos.push(fieldInfo);
    }

    return fieldInfos;
  } catch (error) {
    throw new Error(`Failed to read PDF form fields: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Returns field definitions for static PDFs (from configuration)
 */
export function getStaticFormFields(staticFields: StaticFormField[]): FormFieldInfo[] {
  return staticFields.map((field) => ({
    name: field.name,
    label: field.label,
    type: field.type,
    value: '',
  }));
}

/**
 * Fills an interactive PDF form with provided field data and returns the filled PDF as base64
 */
export async function fillPdfForm(
  pdfPath: string,
  fieldData: FillFormFieldData,
  fieldMapping?: Record<string, string>
): Promise<string> {
  try {
    // Read the PDF file
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Get the form
    const form = pdfDoc.getForm();

    // Apply field mapping if provided
    const mappedFieldData: FillFormFieldData = {};
    for (const [apiFieldName, fieldValue] of Object.entries(fieldData)) {
      // If mapping exists, translate API field name to PDF field name
      const pdfFieldName = fieldMapping?.[apiFieldName] ?? apiFieldName;
      mappedFieldData[pdfFieldName] = fieldValue;
    }

    // Fill each field
    for (const [fieldName, fieldValue] of Object.entries(mappedFieldData)) {
      try {
        // Handle specific account type checkboxes
        // savingsAccountType: Individual -> "Individual 4", Joint -> "Joint 4"
        if (fieldName === 'savingsAccountType' && typeof fieldValue === 'string') {
          const value = String(fieldValue).toLowerCase();
          try {
            const individualCheckbox = form.getCheckBox('Individual 4');
            const jointCheckbox = form.getCheckBox('Joint 4');

            if (value === 'individual') {
              individualCheckbox.check();
              jointCheckbox.uncheck();
            } else if (value === 'joint') {
              jointCheckbox.check();
              individualCheckbox.uncheck();
            }
            continue;
          } catch (error) {
            console.warn(`Warning: Could not find checkboxes for savingsAccountType:`, error);
          }
        }

        // checkingAccountType: Individual -> "Individual 1", Joint -> "Joint 1"
        if (fieldName === 'checkingAccountType' && typeof fieldValue === 'string') {
          const value = String(fieldValue).toLowerCase();
          try {
            const individualCheckbox = form.getCheckBox('Individual 1');
            const jointCheckbox = form.getCheckBox('Joint 1');

            if (value === 'individual') {
              individualCheckbox.check();
              jointCheckbox.uncheck();
            } else if (value === 'joint') {
              jointCheckbox.check();
              individualCheckbox.uncheck();
            }
            continue;
          } catch (error) {
            console.warn(`Warning: Could not find checkboxes for checkingAccountType:`, error);
          }
        }

        // moneyMarketAccountType: Individual -> "Individual 5", Joint -> "Joint 5"
        if (fieldName === 'moneyMarketAccountType' && typeof fieldValue === 'string') {
          const value = String(fieldValue).toLowerCase();
          try {
            const individualCheckbox = form.getCheckBox('Individual 5');
            const jointCheckbox = form.getCheckBox('Joint 5');

            if (value === 'individual') {
              individualCheckbox.check();
              jointCheckbox.uncheck();
            } else if (value === 'joint') {
              jointCheckbox.check();
              individualCheckbox.uncheck();
            }
            continue;
          } catch (error) {
            console.warn(`Warning: Could not find checkboxes for moneyMarketAccountType:`, error);
          }
        }

        const field = form.getField(fieldName);

        if (field instanceof PDFTextField) {
          field.setText(String(fieldValue));
        } else if (field instanceof PDFCheckBox) {
          if (fieldValue === true || fieldValue === 'true') {
            field.check();
          } else {
            field.uncheck();
          }
        } else if (field instanceof PDFDropdown) {
          field.select(String(fieldValue));
        } else if (field instanceof PDFRadioGroup) {
          field.select(String(fieldValue));
        }
      } catch (fieldError) {
        console.warn(`Warning: Could not fill field "${fieldName}":`, fieldError);
        // Continue with other fields even if one fails
      }
    }

    // Flatten the form to make fields non-editable (optional)
    // form.flatten();

    // Save the PDF
    const filledPdfBytes = await pdfDoc.save();

    // Convert to base64
    const base64 = Buffer.from(filledPdfBytes).toString('base64');

    return base64;
  } catch (error) {
    throw new Error(`Failed to fill PDF form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fills a static PDF by drawing text at specified coordinates
 */
export async function fillStaticPdfForm(
  pdfPath: string,
  fieldData: FillFormFieldData,
  staticFields: StaticFormField[]
): Promise<string> {
  try {
    // Read the PDF file
    const pdfBytes = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    // Embed a standard font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Create a map of field definitions
    const fieldMap = new Map(staticFields.map((f) => [f.name, f]));

    // Fill each field by drawing text
    for (const [fieldName, fieldValue] of Object.entries(fieldData)) {
      const fieldDef = fieldMap.get(fieldName);

      if (!fieldDef) {
        console.warn(`Warning: Field "${fieldName}" not found in static field definitions`);
        continue;
      }

      const { position } = fieldDef;
      const page = pdfDoc.getPage(position.page - 1); // Pages are 0-indexed

      const text = String(fieldValue);
      const fontSize = position.fontSize || 10;

      page.drawText(text, {
        x: position.x,
        y: position.y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
    }

    // Save the PDF
    const filledPdfBytes = await pdfDoc.save();

    // Convert to base64
    const base64 = Buffer.from(filledPdfBytes).toString('base64');

    return base64;
  } catch (error) {
    throw new Error(`Failed to fill static PDF form: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
