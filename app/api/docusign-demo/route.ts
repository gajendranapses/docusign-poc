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

type SignerRoles = "primary" | "secondary";

interface Form {
  formId: string;
  signers: {
    email: string;
    firstName: string;
    lastName: string;
    role: SignerRoles;
  }[];
  formFields: Record<string, string>;
}
interface RequestPayload {
  emailSubject: string;
  forms: Form[];
  status?: "created" | "sent";
}

const round = (n: number) => Math.round(n);

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

function getSignersImproved(
  formsWithDocumentId: (Form & { documentId: string })[],
  quikSignLocations: BulkQuikSignLocationResponse[]
) {
  const signersMap = new Map<string, {
    email: string;
    name: string;
    recipientId: string;
    tabs: Tabs;
  }>();

  // Create a map for faster lookup of sign locations
  const signLocationMap = new Map(
    quikSignLocations.map(loc => [loc.FormId, loc])
  );

  formsWithDocumentId.forEach((form) => {
    const signLocation = signLocationMap.get(form.formId);
    
    if (!signLocation) {
      console.warn(`No sign location found for form ${form.formId}`);
    }

    form.signers.forEach((signer) => {
      const filteredSignLocation = {
        SignFields: signLocation?.SignFields?.filter(
          (sf) => sf.FieldRole === signer.role
        ) || [],
        SignDateFields: signLocation?.SignDateFields?.filter(
          (sdf) => sdf.FieldRole === signer.role
        ) || [],
        SignInitialsFields: signLocation?.SignInitialsFields?.filter(
          (sif) => sif.FieldRole === signer.role
        ) || [],
      };

      const existingSigner = signersMap.get(signer.email);
      const newTabs = createTabsFromSignLocation(filteredSignLocation, form.documentId);

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

  return Array.from(signersMap.values());
}

function getSigners(
  formsWIthDocumentId: (Form & { documentId: string })[],
  quikSignLocations: BulkQuikSignLocationResponse[]
) {
  const signers: {
    email: string;
    name: string;
    recipientId: string;
    tabs: Tabs;
  }[] = [];

  formsWIthDocumentId.forEach((form) => {
    const signLocation = quikSignLocations.find(
      (s) => s.FormId === form.formId
    );
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
      const currentSigner = signers.find((s) => s.email === signer.email);
      if (!currentSigner) {
        signers.push({
          email: signer.email,
          name: `${signer.firstName} ${signer.lastName}`,
          recipientId: (signers.length + 1).toString(),
          tabs: {
            signHereTabs: filteredSignLocation.SignFields.map((sf) => ({
              documentId: form.documentId,
              xPosition: round(sf.DocusignXCoord),
              yPosition: round(sf.DocusignYCoord),
              pageNumber: sf.Page.toString(),
            })),
            initialHereTabs: filteredSignLocation.SignInitialsFields.map(
              (sif) => ({
                documentId: form.documentId,
                xPosition: round(sif.DocusignXCoord),
                yPosition: round(sif.DocusignYCoord),
                pageNumber: sif.Page.toString(),
              })
            ),
            dateSignedTabs: filteredSignLocation.SignDateFields.map((sdf) => ({
              documentId: form.documentId,
              xPosition: round(sdf.DocusignXCoord),
              yPosition: round(sdf.DocusignYCoord),
              pageNumber: sdf.Page.toString(),
            })),
            attachmentTabs: [],
          },
        });
      } else {
        currentSigner.tabs.signHereTabs.push(
          ...filteredSignLocation.SignFields.map((sf) => ({
            documentId: form.documentId,
            xPosition: round(sf.DocusignXCoord),
            yPosition: round(sf.DocusignYCoord),
            pageNumber: sf.Page.toString(),
          }))
        );
        currentSigner.tabs.initialHereTabs.push(
          ...filteredSignLocation.SignInitialsFields.map((sif) => ({
            documentId: form.documentId,
            xPosition: round(sif.DocusignXCoord),
            yPosition: round(sif.DocusignYCoord),
            pageNumber: sif.Page.toString(),
          }))
        );
        currentSigner.tabs.dateSignedTabs.push(
          ...filteredSignLocation.SignDateFields.map((sdf) => ({
            documentId: form.documentId,
            xPosition: round(sdf.DocusignXCoord),
            yPosition: round(sdf.DocusignYCoord),
            pageNumber: sdf.Page.toString(),
          }))
        );
      }
    });
  });

  return signers;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPayload;

    const { emailSubject, forms, status = "created" } = body;

    const formsWIthDocumentId = forms.map((form, index) => ({
      ...form,
      documentId: `${index + 1}`,
    }));

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
    const [quikPdfs, quikSignLocations] = await Promise.all([
      generateBulkQuikPdf({
        token: quikToken,
        forms: formattedForms,
      }),
      fetchBulkQuickPdfSignLocations(quikToken, uniqueFormIds),
    ]);

    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    const signers = getSignersImproved(formsWIthDocumentId, quikSignLocations);

    const docusignEnvelope = await createDocusignEnvelope({
      token: docusignToken,
      accountId,
      docusignBaseUrl: apiBaseUrl,
      emailSubject,
      status,
      documents: quikPdfs.map((pdf) => ({
        documentBase64: pdf.pdf,
        documentId: pdf.documentId,
        documentName: pdf.fileName,
      })),
      signers,
    });
    return Response.json(docusignEnvelope);
  } catch (err) {
    console.error(err);
    return new Response("Internal Server Error", { status: 500 });
  }
}
