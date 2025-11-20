# PDF Form Filling API

This API allows you to manage and fill PDF forms programmatically. It supports both interactive PDFs (with fillable form fields) and static PDFs (where text is overlaid at specific coordinates).

## New Unified API

### Fill Any Form (Recommended)

**POST** `/api/forms/fill`

This is the new unified endpoint that accepts a `formId` along with the field data in a single request body.

**Request Body:**

```json
{
  "formId": "ey-checking-account-application",
  "firstName": "John",
  "lastName": "Doe",
  "accountType": "Individual"
}
```

**Response:**

```json
{
  "formId": "ey-checking-account-application",
  "formName": "EY Checking Account Application",
  "pdfBase64": "JVBERi0xLjcKJYGBgYEKCjggMCBv..."
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/forms/fill \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "ey-checking-account-application",
    "accountType": "Individual",
    "primary_firstName": "John",
    "primary_lastName": "Doe",
    "primary_email": "john.doe@example.com"
  }'
```

To save the PDF to a file:

```bash
curl -X POST http://localhost:3001/api/forms/fill \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "ey-checking-account-application",
    "accountType": "Individual",
    "primary_firstName": "John",
    "primary_lastName": "Doe",
    "primary_email": "john.doe@example.com"
  }' | jq -r '.pdfBase64' | base64 -d > filled-form.pdf
```

**Special Field Handling:**

- **Checkbox Groups**: For the EY form, use `accountType: "Individual"` or `accountType: "Joint"` to automatically check/uncheck the appropriate checkboxes.

**EY Form Available Fields:**

The `ey-checking-account-application` supports the following fields:

**Account Type:**

- `accountType` - "Individual" or "Joint"

**Primary Owner Information:**

- `primary_firstName` - First name
- `primary_middleInitial` - Middle initial
- `primary_lastName` - Last name
- `primary_suffix` - Suffix (Jr., Sr., etc.)
- `primary_dob` - Date of birth (MM/DD/YYYY)
- `primary_ssn` - Social Security Number
- `primary_occupation` - Occupation
- `primary_citizenship` - Country of citizenship
- `primary_email` - Email address
- `primary_phone` - Phone number

**Home Address:**

- `homeAddress` - Street address
- `homeCity` - City
- `homeState` - State
- `homeZip` - Zip code

**Mailing Address:**

- `mailingAddress` - Street address
- `mailingCity` - City
- `mailingState` - State
- `mailingZip` - Zip code

**Secondary Owner Information (for Joint accounts):**

- `secondary_firstName` - First name
- `secondary_middleInitial` - Middle initial
- `secondary_lastName` - Last name
- `secondary_suffix` - Suffix
- `secondary_dob` - Date of birth
- `secondary_ssn` - Social Security Number
- `secondary_occupation` - Occupation
- `secondary_citizenship` - Country of citizenship
- `secondary_email` - Email address
- `secondary_phone` - Phone number

**Signatures:**

- `primary_printName` - Primary owner printed name
- `primary_signatureDate` - Primary signature date
- `primary_signature` - Primary signature (text)
- `secondary_printName` - Secondary owner printed name
- `secondary_signatureDate` - Secondary signature date
- `secondary_signature` - Secondary signature (text)

---

## Available Endpoints

### 1. List All Forms

**GET** `/api/forms`

Returns a list of all available forms.

**Response:**

```json
{
  "forms": [
    {
      "id": "ey-checking-account-application",
      "name": "EY Checking Account Application"
    }
  ]
}
```

**Example:**

```bash
curl http://localhost:3001/api/forms
```

---

## Adding New Forms

To add a new form, edit [lib/config/form-registry.ts](lib/config/form-registry.ts):

### For Interactive PDFs (with fillable fields)

```typescript
'my-form-id': {
  id: 'my-form-id',
  name: 'My Form Name',
  path: path.join(process.cwd(), 'client-forms', 'my-form.pdf'),
  isInteractive: true,
}
```

### For Static PDFs

```typescript
'my-static-form': {
  id: 'my-static-form',
  name: 'My Static Form',
  path: path.join(process.cwd(), 'client-forms', 'my-static-form.pdf'),
  isInteractive: false,
  fields: [
    {
      name: 'fieldName',
      label: 'Field Label',
      type: 'text',
      position: { page: 1, x: 100, y: 500, fontSize: 10 },
    },
    // ... more fields
  ],
}
```

**Note:** For static PDFs, you need to manually determine the x/y coordinates where text should be placed. The coordinate system has the origin (0,0) at the bottom-left corner of the page.

---

## Architecture

### Files

- [lib/config/form-registry.ts](lib/config/form-registry.ts) - Form configuration registry
- [lib/utils/pdf-form-handler.ts](lib/utils/pdf-form-handler.ts) - PDF manipulation utilities
- [app/api/forms/route.ts](app/api/forms/route.ts) - List all forms endpoint
- [app/api/forms/fill/route.ts](app/api/forms/fill/route.ts) - Unified fill form endpoint

### Dependencies

- `pdf-lib` - PDF manipulation library

---

## Field Types

The API supports the following field types:

- **text** - Text input fields
- **checkbox** - Boolean checkbox fields (use `true`/`false` as values)
- **dropdown** - Dropdown/select fields
- **radio** - Radio button groups
- **signature** - Signature fields (for static PDFs)
- **date** - Date fields
