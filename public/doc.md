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

### 1. Create Envelope
```
POST https://docusign-poc.vercel.app/api/docusign-demo
```

### 2. Get Envelope Status
```
GET https://docusign-poc.vercel.app/api/docusign-envelopes/{envelopeId}/status
```

---

## 📝 Important Notes

- **documentId** and **recipientId** should be unique and positive numbers (e.g. "1", "2", "3", "99")
- PDF forms are generated from a static formId: `71259`
- Signing roles map to exact x/y coordinates in the PDF

---

## 📮 Create Envelope API

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
- `1own`, `2own`, `3own`, `4own`
- `1authind` (authorized individual)

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

### Create Envelope

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
   - Copy any of the sample scenarios above
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

