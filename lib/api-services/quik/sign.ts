type Field = {
  DocusignXCoord: number;
  DocusignYCoord: number;
  Page: number;
};

export type QuikFields = {
  SignFields: Field[];
  SignDateFields: Field[];
  SignInitialsFields: Field[];
};

export const transformToTabs = (form: QuikFields, documentId: string = '1') => {
  const round = (n: number) => Math.round(n);

  const signHereTabs = form.SignFields.map((field) => ({
    documentId,
    pageNumber: field.Page.toString(),
    xPosition: round(field.DocusignXCoord),
    yPosition: round(field.DocusignYCoord),
  }));

  const dateSignedTabs = form.SignDateFields.map((field) => ({
    documentId,
    pageNumber: field.Page.toString(),
    xPosition: round(field.DocusignXCoord),
    yPosition: round(field.DocusignYCoord),
  }));

  const initialHereTabs = form.SignInitialsFields.map((field) => ({
    documentId,
    pageNumber: field.Page.toString(),
    xPosition: round(field.DocusignXCoord),
    yPosition: round(field.DocusignYCoord),
  }));

  return {
    signHereTabs,
    dateSignedTabs,
    initialHereTabs,
  };
};

export const fetchQuikPdfSign = async (
  token: string,
  formId: string,
  documentId: string,
) => {
  const baseUrl = process.env.QUIK_BASE_URL;
  const response = await fetch(
    `${baseUrl}/rest/QFEM/v2000/fields/esign?formIds=${formId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    },
  );
  const data = await response.json();
  if (data.Errors || !data?.ResultData?.length) {
    throw new Error('error in getting quik pdf sign locations');
  }

  return {
    tabs: transformToTabs(data.ResultData[0], documentId),
    documentId,
  };
};

export const fetchQuickPdfSignLocations = async (
  token: string,
  forms: {
    formId: string;
    documentId: string;
  }[],
) => {
  const signLocations = await Promise.all(
    forms.map((form) => fetchQuikPdfSign(token, form.formId, form.documentId)),
  );
  return signLocations;
};
