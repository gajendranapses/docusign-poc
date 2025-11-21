# PDF Form Filling API

This API allows you to manage and fill PDF forms programmatically. It supports both interactive PDFs (with fillable form fields) and static PDFs (where text is overlaid at specific coordinates).

## Authentication

All API endpoints require authentication using an API key.

**Header Required:**

```bash
x-api-key: your-api-key-here
```

The API key is configured in the `.env` file as `API_SECRET_KEY`.

---

## Unified API Endpoint

### Fill Any Form

**POST** `/api/forms/fill`

This unified endpoint accepts a `formId` along with the field data in a single request body. The API uses field mapping to translate friendly field names to the actual PDF field names.

**Request Body:**

```json
{
  "formId": "demo-checking-savings-application",
  "accountType": "Individual",
  "primaryOwnerName": "John Smith",
  "primaryOwnerSsn": "123-45-6789",
  "secondaryOwnerFirstName": "Jane",
  "secondaryOwnerLastName": "Doe"
}
```

**Response:**

```json
{
  "formId": "demo-checking-savings-application",
  "formName": "demo Checking and Savings Account Application",
  "pdfBase64": "JVBERi0xLjcKJYGBgYEKCjggMCBv..."
}
```

**Example:**

```bash
curl -X POST http://localhost:3001/api/forms/fill \
  -H "Content-Type: application/json" \
  -H "x-api-key: <secret-key>" \
  -d '{
    "formId": "demo-checking-savings-application",
    "accountType": "Individual",
    "primaryOwnerName": "John Smith",
    "primaryOwnerSsn": "123-45-6789"
  }'
```

**Save PDF to file:**

```bash
curl -X POST http://localhost:3001/api/forms/fill \
  -H "Content-Type: application/json" \
  -H "x-api-key: <secret-key>" \
  -d '{
    "formId": "demo-checking-savings-application",
    "accountType": "Joint",
    "primaryOwnerName": "John Smith",
    "secondaryOwnerFirstName": "Jane",
    "secondaryOwnerLastName": "Doe"
  }' | jq -r '.pdfBase64' | base64 -d > filled-form.pdf
```

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
      "id": "demo-checking-savings-application",
      "name": "demo Checking and Savings Account Application"
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

**Without Field Mapping:**

```typescript
'my-form-id': {
  id: 'my-form-id',
  name: 'My Form Name',
  path: path.join(process.cwd(), 'client-forms', 'my-form.pdf'),
  isInteractive: true,
}
```

**With Field Mapping (Recommended):**

```typescript
'my-form-id': {
  id: 'my-form-id',
  name: 'My Form Name',
  path: path.join(process.cwd(), 'client-forms', 'my-form.pdf'),
  isInteractive: true,
  fieldMapping: {
    // API field name -> PDF field name
    firstName: 'First Name',
    lastName: 'Last Name',
    email: 'Email Address',
    // ... more mappings
  },
}
```

Field mapping allows you to use friendly API field names that get translated to the actual PDF field names.

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

- [lib/config/form-registry.ts](lib/config/form-registry.ts) - Form configuration registry with field mappings
- [lib/utils/pdf-form-handler.ts](lib/utils/pdf-form-handler.ts) - PDF manipulation utilities
- [app/api/forms/route.ts](app/api/forms/route.ts) - List all forms endpoint
- [app/api/forms/fill/route.ts](app/api/forms/fill/route.ts) - Unified fill form endpoint

### Dependencies

- `pdf-lib` - PDF manipulation library

### How Field Mapping Works

1. Client sends request with friendly field names (e.g., `primaryOwnerName`)
2. API looks up field mapping in form configuration
3. API translates friendly names to PDF field names (e.g., `Primary Owners Name/Account Title`)
4. PDF is filled using the actual PDF field names
5. Filled PDF is returned as base64

---

## Field Types

The API supports the following field types:

- **text** - Text input fields
- **checkbox** - Boolean checkbox fields (use `true`/`false` as values)
- **dropdown** - Dropdown/select fields
- **radio** - Radio button groups
- **signature** - Signature fields (for static PDFs)
- **date** - Date fields

---

## Error Responses

### 401 Unauthorized

Missing or invalid API key

```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

### 400 Bad Request

Missing required fields

```json
{
  "error": "Bad Request",
  "message": "Request body must contain a \"formId\" field"
}
```

### 404 Not Found

Form ID not found

```json
{
  "error": "Form not found",
  "message": "No form found with ID: invalid-form-id"
}
```

### 500 Internal Server Error

Server or processing error

```json
{
  "error": "Internal Server Error",
  "message": "Failed to fill PDF form: [error details]"
}
```

---

## Setup

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Set your API key in `.env`:

   ```bash
   API_SECRET_KEY=your-secret-api-key-here
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. The API will be available at `http://localhost:3001`
