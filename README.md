# 📄 DocuSign POC API

This is a **Proof of Concept (POC)** API to create and send a DocuSign envelope using a **static Quik form**.

## 🔐 Authentication

All APIs require authentication using an API key header:

```
x-api-key: <secret-key>
```

> 🚨 Include this header in all API requests  
> ✅ The API secret key will be provided separately  
> ✅ All DocuSign and Quik authentication is handled internally by the API

---

## 📮 Available Endpoints

### 1. Create Envelope (Dynamic Forms)
```
POST https://docusign-poc.vercel.app/api/docusign-demo
```

### 2. Create Envelope (Static Form 71259)
```
POST https://docusign-poc.vercel.app/api/docusign-demo/form-71259
```

### 3. Get Envelope Status
```
GET https://docusign-poc.vercel.app/api/docusign-envelopes/{envelopeId}/status
```

---

## 📝 Important Notes

- **documentId** and **recipientId** should be unique and positive numbers (e.g. "1", "2", "3", "99")
- The dynamic forms endpoint supports multiple Quik forms with automatic sign location detection
- The static form endpoint uses formId: `71259` with predefined signing locations

---

## 📮 Create Envelope API (Dynamic Forms)

This endpoint allows you to create DocuSign envelopes with multiple Quik forms, automatically detecting signing locations based on signer roles.

### Request Body Format

```json
{
  "emailSubject": "Please sign these documents",
  "forms": [
    {
      "formId": "71259",
      "signers": [
        {
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "role": "primary"
        },
        {
          "email": "jane@example.com",
          "firstName": "Jane",
          "lastName": "Smith",
          "role": "secondary"
        }
      ],
      "formFields": {
        "1own.FName": "John",
        "1own.LName": "Doe",
        "2own.FName": "Jane",
        "2own.LName": "Smith",
        "1ent.EntityName": "Acme Inc."
      }
    }
  ],
  "status": "sent"
}
```

### Response Format

```json
{
  "envelopeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "sent"
}
```

### Field Reference

#### `forms`

Array of forms to be included in the envelope. Each form object contains:

| Property     | Type     | Description                                           |
|-------------|----------|-------------------------------------------------------|
| `formId`    | string   | Quik form ID (e.g., "71259", "71260")                |
| `signers`   | array    | Array of signers for this specific form              |
| `formFields`| object   | Key-value pairs of field names and values            |

#### `signers`

Each signer object contains:

| Property    | Type   | Description                                    |
|------------|--------|------------------------------------------------|
| `email`     | string | Signer's email address                         |
| `firstName` | string | Signer's first name                            |
| `lastName`  | string | Signer's last name                             |
| `role`      | string | Signer role: "primary" or "secondary"          |

#### `formFields`

Form fields are specific to each Quik form. Common fields include:
- `1own.FName`, `1own.LName` - Primary owner name fields
- `2own.FName`, `2own.LName` - Secondary owner name fields
- `1ent.EntityName` - Business entity name

#### `status`

- `"created"` - Create envelope in draft status
- `"sent"` - Create and immediately send envelope (default)

### Sample Scenarios

#### 1️⃣ Single Form with Multiple Signers

```json
{
  "emailSubject": "Partnership Agreement",
  "forms": [
    {
      "formId": "71259",
      "signers": [
        {
          "email": "alice@example.com",
          "firstName": "Alice",
          "lastName": "Johnson",
          "role": "primary"
        },
        {
          "email": "bob@example.com",
          "firstName": "Bob",
          "lastName": "Williams",
          "role": "secondary"
        }
      ],
      "formFields": {
        "1own.FName": "Alice",
        "1own.LName": "Johnson",
        "2own.FName": "Bob",
        "2own.LName": "Williams",
        "1ent.EntityName": "Johnson & Williams LLC"
      }
    }
  ],
  "status": "sent"
}
```

#### 2️⃣ Multiple Forms with Different Signers

```json
{
  "emailSubject": "Multiple Documents for Signing",
  "forms": [
    {
      "formId": "71259",
      "signers": [
        {
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "role": "primary"
        }
      ],
      "formFields": {
        "1own.FName": "John",
        "1own.LName": "Doe",
        "1ent.EntityName": "Doe Enterprises"
      }
    },
    {
      "formId": "71260",
      "signers": [
        {
          "email": "jane@example.com",
          "firstName": "Jane",
          "lastName": "Smith",
          "role": "primary"
        },
        {
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "role": "secondary"
        }
      ],
      "formFields": {
        "1own.FName": "Jane",
        "1own.LName": "Smith",
        "2own.FName": "John",
        "2own.LName": "Doe"
      }
    }
  ],
  "status": "sent"
}
```

#### 3️⃣ Single Signer for Multiple Forms

```json
{
  "emailSubject": "Complete Package for John Doe",
  "forms": [
    {
      "formId": "71259",
      "signers": [
        {
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "role": "primary"
        }
      ],
      "formFields": {
        "1own.FName": "John",
        "1own.LName": "Doe"
      }
    },
    {
      "formId": "71261",
      "signers": [
        {
          "email": "john@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "role": "primary"
        }
      ],
      "formFields": {
        "1own.FName": "John",
        "1own.LName": "Doe",
        "1ent.EntityName": "Doe Corp"
      }
    }
  ],
  "status": "created"
}
```

---

## 📮 Create Envelope API (Static Form 71259)

This endpoint uses the original implementation with a static Quik form (ID: 71259) and predefined signing locations.

### Request Body Format

```json
{
  "emailSubject": "POC Testing Envelope",
  "formDataPerDocument": [
    {
      "documentId": "1",
      "formFields": [
        { "FieldName": "1own.FName", "FieldValue": "Joe" },
        { "FieldName": "1own.MName", "FieldValue": "" },
        { "FieldName": "1own.LName", "FieldValue": "Doe" },
        { "FieldName": "1ent.EntityName", "FieldValue": "Acme Inc." }
      ]
    }
  ],
  "recipientDetails": [
    {
      "email": "john@example.com",
      "name": "John Doe",
      "recipientId": "1",
      "documents": [
        {
          "documentId": "1",
          "roles": ["1own"]
        }
      ]
    }
  ],
  "additionalDocuments": [
    {
      "documentId": "99",
      "documentBase64": "<base64-pdf>",
      "fileName": "extra.pdf"
    }
  ],
  "status": "sent"
}
```

### Response Format

```json
{
  "envelopeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "status": "sent"
}
```

### Field Reference

#### `formDataPerDocument`

Each object defines a document (using a **static Quik form**) and fills it with values.

**Minimal Required Fields:**

| Field Name          | Description         |
|---------------------|----------------------|
| `1own.FName`        | First name           |
| `1own.MName`        | Middle name (optional) |
| `1own.LName`        | Last name            |
| `1ent.EntityName`   | Business name        |

#### `recipientDetails`

Defines each signer.

| Property       | Description                                       |
|----------------|---------------------------------------------------|
| `email`        | Signer's email                                    |
| `name`         | Full name                                         |
| `recipientId`  | Unique identifier                                 |
| `documents`    | List of documents the signer signs & their roles  |
| `attachments`  | Optional files required to be uploaded by signer  |

**Available Roles:**
- `1own`, `2own`, `3own`, `4own`,`1authind`

### Sample Scenarios

#### 1️⃣ One Document → One Signer

```json
"formDataPerDocument": [{ "documentId": "1", "formFields": [...] }],
"recipientDetails": [
  {
    "email": "a@a.com",
    "name": "Alice",
    "recipientId": "1",
    "documents": [
      { "documentId": "1", "roles": ["1own"] }
    ]
  }
]
```

#### 2️⃣ One Document → Multiple Signers

```json
"recipientDetails": [
  {
    "email": "a@a.com",
    "name": "Alice",
    "recipientId": "1",
    "documents": [{ "documentId": "1", "roles": ["1own"] }]
  },
  {
    "email": "b@b.com",
    "name": "Bob",
    "recipientId": "2",
    "documents": [{ "documentId": "1", "roles": ["2own"] }]
  }
]
```

#### 3️⃣ Multiple Documents → One Signer

```json
"formDataPerDocument": [
  { "documentId": "1", "formFields": [...] },
  { "documentId": "2", "formFields": [...] }
],
"recipientDetails": [
  {
    "email": "user@example.com",
    "name": "User",
    "recipientId": "1",
    "documents": [
      { "documentId": "1", "roles": ["1own"] },
      { "documentId": "2", "roles": ["2own"] }
    ]
  }
]
```

#### 4️⃣ Multiple Documents → Multiple Signers

```json
"recipientDetails": [
  {
    "email": "john@example.com",
    "name": "John",
    "recipientId": "1",
    "documents": [
      { "documentId": "1", "roles": ["1own"] },
      { "documentId": "2", "roles": ["2own"] }
    ]
  },
  {
    "email": "jane@example.com",
    "name": "Jane",
    "recipientId": "2",
    "documents": [
      { "documentId": "2", "roles": ["3own"] }
    ]
  }
]
```

---

## 📬 Get Envelope Status API

### Request Parameters

| Parameter    | Type   | Location | Description                    |
|-------------|--------|----------|--------------------------------|
| envelopeId  | string | Path     | The DocuSign envelope ID       |

### Response Format

```json
{
  "status": "sent",
  "envelopeId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "created": "2024-03-15T09:00:00Z",
  "sentDateTime": "2024-03-15T09:00:00Z",
  "completed": null,
  "declined": null,
  "voided": null,
  "recipients": {
    "signers": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "status": "sent",
        "recipientId": "1",
        "deliveredDateTime": "2024-03-15T09:00:00Z",
        "signedDateTime": null
      }
    ]
  }
}
```

### Status Values

| Status      | Description                                      |
|-------------|--------------------------------------------------|
| created     | Envelope is created but not sent                 |
| sent        | Envelope has been sent to recipients             |
| delivered   | Envelope has been delivered to recipients        |
| completed   | All recipients have completed their actions      |
| declined    | One or more recipients declined to sign          |
| voided      | Envelope has been voided                         |

---

## ⚠️ Error Responses

All APIs return similar error formats:

```json
// 401 Unauthorized
{
  "error": "Unauthorized - Invalid API Key"
}

// 404 Not Found
{
  "error": "Envelope not found"
}

// 500 Internal Server Error
{
  "error": "Internal server error"
}
```

---

## 🧪 How to Test Using Postman

### Create Envelope (Dynamic Forms)

1. Open **Postman**
2. Create a new request:
   - Method: `POST`
   - URL: `https://docusign-poc.vercel.app/api/docusign-demo`
3. Add Headers:
   - `Content-Type`: `application/json`
   - `x-api-key`: `<secret-key>` (will be provided separately)
4. Body:
   - Select: `raw`
   - Format: `JSON`
   - Copy any of the dynamic forms sample scenarios above
5. Click **Send**

### Create Envelope (Static Form 71259)

1. Open **Postman**
2. Create a new request:
   - Method: `POST`
   - URL: `https://docusign-poc.vercel.app/api/docusign-demo/form-71259`
3. Add Headers:
   - `Content-Type`: `application/json`
   - `x-api-key`: `<secret-key>` (will be provided separately)
4. Body:
   - Select: `raw`
   - Format: `JSON`
   - Copy any of the static form sample scenarios above
5. Click **Send**

### Get Envelope Status

1. Open **Postman**
2. Create a new request:
   - Method: `GET`
   - URL: `https://docusign-poc.vercel.app/api/docusign-envelopes/{envelopeId}/status`
   - Replace `{envelopeId}` with actual envelope ID
3. Add Headers:
   - `x-api-key`: `<secret-key>` (will be provided separately)
4. Click **Send**

---

## 🧪 Sample Base64 PDF

Use this as a sample for Base64 PDF in additionalDocuments:

```
JVBERi0xLjQKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nCi9QYWdlcyAyIDAgUgo+PgplbmRvYmoK MiAwIG9iago8PC9UeXBlIC9QYWdlcwovS2lkcyBbMyAwIFJdCi9Db3VudCAxCj4+CmVuZG9iagoz IDAgb2JqCjw8L1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA1OTUgODQy XQovQ29udGVudHMgNSAwIFIKL1Jlc291cmNlcyA8PC9Qcm9jU2V0IFsvUERGIC9UZXh0XQovRm9u dCA8PC9GMSA0IDAgUj4+Cj4+Cj4+CmVuZG9iago0IDAgb2JqCjw8L1R5cGUgL0ZvbnQKL1N1YnR5 cGUgL1R5cGUxCi9OYW1lIC9GMQovQmFzZUZvbnQgL0hlbHZldGljYQovRW5jb2RpbmcgL01hY1Jv bWFuRW5jb2RpbmcKPj4KZW5kb2JqCjUgMCBvYmoKPDwvTGVuZ3RoIDUzCj4+CnN0cmVhbQpCVAov RjEgMjAgVGYKMjIwIDQwMCBUZAooRHVtbXkgUERGKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCnhy ZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZgowMDAwMDAwMDA5IDAwMDAwIG4KMDAwMDAwMDA2MyAw MDAwMCBuCjAwMDAwMDAxMjQgMDAwMDAgbgowMDAwMDAwMjc3IDAwMDAwIG4KMDAwMDAwMDM5MiAw MDAwMCBuCnRyYWlsZXIKPDwvU2l6ZSA2Ci9Sb290IDEgMCBSCj4+CnN0YXJ0eHJlZgo0OTUKJSVF T0YK
```