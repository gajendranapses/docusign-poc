import { NextRequest } from "next/server";
import { getDocusignToken } from "@/lib/api-services/docusign/auth";
import { getDocusignBaseUrl } from "@/lib/api-services/docusign/base";
import {
  createDocusignEnvelope,
  Tabs,
} from "@/lib/api-services/docusign/envelope";
import { getQuikToken } from "@/lib/api-services/quik/auth";
import { generateBulkQuikPdf } from "@/lib/api-services/quik/pdf";
import {
  BulkQuikSignLocationResponse,
  fetchBulkQuickPdfSignLocations,
} from "@/lib/api-services/quik/sign";

type SignerRoles = "1own" | "2own";

interface Form {
  formId: string;
  signers: {
    email: string;
    firstName: string;
    lastName: string;
    role: SignerRoles;
  }[];
  cc?: {
    name: string;
    email: string;
  }[];
  formFields: Record<string, string>;
}

interface SignLocation {
  xPosition: number;
  yPosition: number;
  pageNumber: string;
}

interface AdditionalPDF {
  documentName: string;
  documentBase64: string;
  signers?: {
    email: string;
    firstName: string;
    lastName: string;
    signLocations?: {
      signHere?: SignLocation[];
      initialHere?: SignLocation[];
      dateSigned?: SignLocation[];
    };
  }[];
}

interface RequestPayload {
  emailSubject: string;
  forms?: Form[];
  status?: "created" | "sent";
  additionalPDFs?: AdditionalPDF[];
}

const round = (n: number) => Math.round(n);

function getCCArray(
  startingId: number,
  formsWithDocumentId?: (Form & { documentId: string })[],
  additionalPDFsWithDocumentId?: (AdditionalPDF & { documentId: string })[]
) {
  const cc: {
    name: string;
    email: string;
    recipientId: string;
    routingOrder: string;
    excludedDocuments: string[];
  }[] = [];
  let count = startingId;
  formsWithDocumentId?.forEach((form) => {
    form.cc?.forEach((ccData) => {
      const getCC = cc.find((c) => c.email === ccData.email);
      if (!getCC) {
        // Exclude forms where this CC is not listed
        const excludedFormDocuments = formsWithDocumentId
          .filter((form) => !form.cc?.find((c) => c.email === ccData.email))
          .map((form) => form.documentId);
        
        // Exclude all additionalPDFs since CCs from forms shouldn't see them
        const excludedAdditionalPDFDocuments = additionalPDFsWithDocumentId?.map((pdf) => pdf.documentId) || [];
        
        const excludedDocuments = [...excludedFormDocuments, ...excludedAdditionalPDFDocuments];
        
        cc.push({
          name: ccData.name,
          email: ccData.email,
          recipientId: count.toString(),
          routingOrder: "2",
          excludedDocuments,
        });
        count++;
      }
    });
  });
  return cc;
}

function createTabsFromSignLocation(
  filteredSignLocation: {
    SignFields: any[];
    SignDateFields: any[];
    SignInitialsFields: any[];
  },
  documentId: string
) {
  return {
    signHereTabs: filteredSignLocation.SignFields.map((sf) => ({
      documentId,
      xPosition: round(sf.DocusignXCoord),
      yPosition: round(sf.DocusignYCoord),
      pageNumber: sf.Page.toString(),
    })),
    initialHereTabs: filteredSignLocation.SignInitialsFields.map((sif) => ({
      documentId,
      xPosition: round(sif.DocusignXCoord),
      yPosition: round(sif.DocusignYCoord),
      pageNumber: sif.Page.toString(),
    })),
    dateSignedTabs: filteredSignLocation.SignDateFields.map((sdf) => ({
      documentId,
      xPosition: round(sdf.DocusignXCoord),
      yPosition: round(sdf.DocusignYCoord),
      pageNumber: sdf.Page.toString(),
    })),
  };
}

function processAdditionalPDFSigners(
  additionalPDFs: (AdditionalPDF & { documentId: string })[],
  existingSignersMap: Map<
    string,
    {
      email: string;
      name: string;
      recipientId: string;
      tabs: Tabs;
    }
  >
) {
  additionalPDFs.forEach((pdf) => {
    pdf.signers?.forEach((signer) => {
      const existingSigner = existingSignersMap.get(signer.email);

      const newTabs: Tabs = {
        signHereTabs:
          signer.signLocations?.signHere?.map((loc) => ({
            documentId: pdf.documentId,
            xPosition: round(loc.xPosition),
            yPosition: round(loc.yPosition),
            pageNumber: loc.pageNumber,
          })) || [],
        initialHereTabs:
          signer.signLocations?.initialHere?.map((loc) => ({
            documentId: pdf.documentId,
            xPosition: round(loc.xPosition),
            yPosition: round(loc.yPosition),
            pageNumber: loc.pageNumber,
          })) || [],
        dateSignedTabs:
          signer.signLocations?.dateSigned?.map((loc) => ({
            documentId: pdf.documentId,
            xPosition: round(loc.xPosition),
            yPosition: round(loc.yPosition),
            pageNumber: loc.pageNumber,
          })) || [],
        attachmentTabs: [],
      };

      if (!existingSigner) {
        existingSignersMap.set(signer.email, {
          email: signer.email,
          name: `${signer.firstName} ${signer.lastName}`,
          recipientId: (existingSignersMap.size + 1).toString(),
          tabs: newTabs,
        });
      } else {
        // Merge tabs for existing signer
        existingSigner.tabs.signHereTabs.push(...newTabs.signHereTabs);
        existingSigner.tabs.initialHereTabs.push(...newTabs.initialHereTabs);
        existingSigner.tabs.dateSignedTabs.push(...newTabs.dateSignedTabs);
      }
    });
  });
}

function getSignersImproved(
  formsWithDocumentId: (Form & { documentId: string })[],
  quikSignLocations: BulkQuikSignLocationResponse[],
  additionalPDFsWithDocumentId: (AdditionalPDF & { documentId: string })[] = []
) {
  const signersMap = new Map<
    string,
    {
      email: string;
      name: string;
      recipientId: string;
      tabs: Tabs;
    }
  >();

  // Create a map for faster lookup of sign locations
  const signLocationMap = new Map(
    quikSignLocations.map((loc) => [loc.FormId.toString(), loc])
  );

  formsWithDocumentId.forEach((form) => {
    const signLocation = signLocationMap.get(form.formId);

    if (!signLocation) {
      console.warn(`No sign location found for form ${form.formId}`);
    }

    form.signers.forEach((signer) => {
      const filteredSignLocation = {
        SignFields:
          signLocation?.SignFields?.filter(
            (sf) => sf.FieldRole === signer.role
          ) || [],
        SignDateFields:
          signLocation?.SignDateFields?.filter(
            (sdf) => sdf.FieldRole === signer.role
          ) || [],
        SignInitialsFields:
          signLocation?.SignInitialsFields?.filter(
            (sif) => sif.FieldRole === signer.role
          ) || [],
      };

      const existingSigner = signersMap.get(signer.email);
      const newTabs = createTabsFromSignLocation(
        filteredSignLocation,
        form.documentId
      );

      if (!existingSigner) {
        signersMap.set(signer.email, {
          email: signer.email,
          name: `${signer.firstName} ${signer.lastName}`,
          recipientId: (signersMap.size + 1).toString(),
          tabs: {
            ...newTabs,
            attachmentTabs: [],
          },
        });
      } else {
        // Merge tabs for existing signer
        existingSigner.tabs.signHereTabs.push(...newTabs.signHereTabs);
        existingSigner.tabs.initialHereTabs.push(...newTabs.initialHereTabs);
        existingSigner.tabs.dateSignedTabs.push(...newTabs.dateSignedTabs);
      }
    });
  });

  // Process additional PDF signers
  processAdditionalPDFSigners(additionalPDFsWithDocumentId, signersMap);

  return Array.from(signersMap.values());
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RequestPayload;

    const {
      emailSubject,
      forms = [],
      status = "created",
      additionalPDFs = [],
    } = body;

    // Validate that at least one document source is provided
    if (forms.length === 0 && additionalPDFs.length === 0) {
      return new Response("At least one form or additional PDF is required", {
        status: 400,
      });
    }

    // Assign document IDs: additional PDFs first, then Quik forms
    const additionalPDFsWithDocumentId = additionalPDFs.map((pdf, index) => ({
      ...pdf,
      documentId: `${index + 1}`,
    }));

    const formsWIthDocumentId = forms.map((form, index) => ({
      ...form,
      documentId: `${additionalPDFs.length + index + 1}`,
    }));

    // Only process Quik forms if they exist
    let quikPdfs: any[] = [];
    let quikSignLocations: any[] = [];

    if (forms.length > 0) {
      const uniqueFormIds = [...new Set(forms.map((form) => form.formId))];
      const quikToken = await getQuikToken();

      const formattedForms = formsWIthDocumentId.map((form) => ({
        formId: form.formId,
        documentId: form.documentId,
        formFields: Object.entries(form.formFields).map(([key, value]) => ({
          FieldName: key,
          FieldValue: value,
        })),
      }));

      [quikPdfs, quikSignLocations] = await Promise.all([
        generateBulkQuikPdf({
          token: quikToken,
          forms: formattedForms,
        }),
        fetchBulkQuickPdfSignLocations(quikToken, uniqueFormIds),
      ]);
    }

    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    const signers = getSignersImproved(
      formsWIthDocumentId,
      quikSignLocations,
      additionalPDFsWithDocumentId
    );

    const cc = getCCArray(signers.length + 1, formsWIthDocumentId, additionalPDFsWithDocumentId);

    // Combine additional PDFs first, then Quik PDFs
    const allDocuments = [
      ...additionalPDFsWithDocumentId.map((pdf) => ({
        documentBase64: pdf.documentBase64,
        documentId: pdf.documentId,
        documentName: pdf.documentName,
      })),
      ...quikPdfs.map((pdf) => ({
        documentBase64: pdf.pdf,
        documentId: pdf.documentId,
        documentName: pdf.fileName,
      })),
    ];

    const docusignEnvelope = await createDocusignEnvelope({
      token: docusignToken,
      accountId,
      docusignBaseUrl: apiBaseUrl,
      emailSubject,
      status,
      documents: allDocuments,
      signers,
      cc
    });
    return Response.json(docusignEnvelope);
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
