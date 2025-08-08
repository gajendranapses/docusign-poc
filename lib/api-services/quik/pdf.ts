export interface QuikPdfFormField {
  FieldName: string;
  FieldValue: string;
}

export const generateQuikPdf = async ({
  token,
  formId,
  formFields,
  documentId,
}: {
  token: string;
  formId: string;
  formFields: QuikPdfFormField[];
  documentId: string;
}) => {
  const baseUrl = process.env.QUIK_BASE_URL;

  const response = await fetch(
    `${baseUrl}/rest/QuikFormsEngine/qfe/execute/pdf`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        HostFormOnQuik: true,
        FormFields: formFields,
        QuikFormID: formId,
      }),
    },
  );

  const data = await response.json();
  if (data.Errors || !data?.ResultData?.PDF) {
    throw new Error('error in generating pdf');
  }
  return {
    pdf: data.ResultData.PDF as string,
    fileName: (data.ResultData.FormShortName+"-"+documentId) as string,
    documentId,
  };
};

export const generateBulkQuikPdf = async ({
  token,
  forms,
}: {
  token: string;
  forms: {
    formId: string;
    formFields: QuikPdfFormField[];
    documentId: string;
  }[];
}) => {
  const pdfs = await Promise.all(
    forms.map(({ formId, formFields, documentId }) =>
      generateQuikPdf({
        token,
        formId,
        formFields,
        documentId,
      }),
    ),
  );
  return pdfs;
};
