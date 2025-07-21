import { getDocusignToken } from "@/lib/api-services/docusign/auth";
import { getDocusignBaseUrl } from "@/lib/api-services/docusign/base";

interface SignerDocument {
  documentId: string;
  documentName: string;
  status: "signed" | "not_signed";
  signedDateTime?: string;
}

interface SignerStatus {
  email: string;
  name: string;
  signedCount: number;
  totalDocuments: number;
  documents: SignerDocument[];
}

interface TimelineEvent {
  status: "created" | "sent" | "delivered" | "signed" | "completed";
  dateTime: string;
  completed: boolean;
}

interface EnvelopeSignersStatusResponse {
  envelopeId: string;
  status: string;
  timeline: TimelineEvent[];
  signers: SignerStatus[];
}

export async function GET(
  request: Request,
  { params }: { params: { envelopeId: string } }
) {
  try {
    const { envelopeId } = params;

    // Get DocuSign token and base URL
    const docusignToken = await getDocusignToken();
    const { apiBaseUrl, accountId } = await getDocusignBaseUrl(docusignToken);

    // Fetch envelope details including recipients and documents
    const [envelopeResponse, recipientsResponse, documentsResponse] = await Promise.all([
      fetch(`${apiBaseUrl}/accounts/${accountId}/envelopes/${envelopeId}`, {
        headers: {
          Authorization: `Bearer ${docusignToken}`,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${apiBaseUrl}/accounts/${accountId}/envelopes/${envelopeId}/recipients?include_tabs=true`, {
        headers: {
          Authorization: `Bearer ${docusignToken}`,
          "Content-Type": "application/json",
        },
      }),
      fetch(`${apiBaseUrl}/accounts/${accountId}/envelopes/${envelopeId}/documents`, {
        headers: {
          Authorization: `Bearer ${docusignToken}`,
          "Content-Type": "application/json",
        },
      }),
    ]);

    if (!envelopeResponse.ok || !recipientsResponse.ok || !documentsResponse.ok) {
      throw new Error("Failed to fetch envelope details from DocuSign");
    }

    const envelope = await envelopeResponse.json();
    const recipients = await recipientsResponse.json();
    const documents = await documentsResponse.json();

    // Filter out the certificate document (usually documentId = "certificate")
    const signingDocuments = documents.envelopeDocuments.filter(
      (doc: any) => doc.documentId !== "certificate" && doc.documentId !== "summary"
    );

    // Build signer status data
    const signersMap = new Map<string, SignerStatus>();

    // Process each signer
    recipients.signers?.forEach((signer: any) => {
      const signerEmail = signer.email.toLowerCase();
      
      if (!signersMap.has(signerEmail)) {
        signersMap.set(signerEmail, {
          email: signer.email,
          name: signer.name,
          signedCount: 0,
          totalDocuments: 0,
          documents: [],
        });
      }

      const signerStatus = signersMap.get(signerEmail)!;

      // Get tabs for this signer to determine which documents they need to sign
      const signerTabs = signer.tabs || {};
      const documentIds = new Set<string>();

      // Collect all document IDs from all tab types
      const tabTypes = ['signHereTabs', 'initialHereTabs', 'dateSignedTabs', 'textTabs', 'checkboxTabs'];
      tabTypes.forEach(tabType => {
        if (signerTabs[tabType]) {
          signerTabs[tabType].forEach((tab: any) => {
            documentIds.add(tab.documentId);
          });
        }
      });

      // For each document this signer needs to sign
      documentIds.forEach(docId => {
        const document = signingDocuments.find((doc: any) => doc.documentId === docId);
        if (document) {
          // Get all tabs for this document for this signer
          const documentTabs: any[] = [];
          let signedDateTime: string | undefined;

          // Collect all tabs for this document
          tabTypes.forEach(tabType => {
            if (signerTabs[tabType]) {
              signerTabs[tabType].forEach((tab: any) => {
                if (tab.documentId === docId) {
                  documentTabs.push(tab);
                }
              });
            }
          });

          // Check if ALL tabs for this document are signed
          // A tab is considered signed if it has status="signed" OR has a value (for date tabs, etc.)
          const allTabsSigned = documentTabs.length > 0 && documentTabs.every(tab => {
            // For signHere tabs, check for "signed" status
            if (tab.tabType === "signhere") {
              return tab.status === "signed";
            }
            // For other tabs like dateSignedTabs, check if they have a value
            if (tab.tabType === "datesigned") {
              return tab.value && tab.value.trim() !== "";
            }
            // For other tab types, check for signed status or value
            return tab.status === "signed" || (tab.value && tab.value.trim() !== "");
          });

          // Get the signed date from any of the signed tabs or signer
          if (allTabsSigned) {
            const signedTab = documentTabs.find(tab => tab.signedDateTime);
            signedDateTime = signedTab?.signedDateTime || signer.signedDateTime;
          }
          
          signerStatus.documents.push({
            documentId: document.documentId,
            documentName: document.name,
            status: allTabsSigned ? "signed" : "not_signed",
            signedDateTime: allTabsSigned ? signedDateTime : undefined,
          });

          signerStatus.totalDocuments++;
          if (allTabsSigned) {
            signerStatus.signedCount++;
          }
        }
      });
    });

    // Convert map to array and sort by email
    const signers = Array.from(signersMap.values()).sort((a, b) => 
      a.email.localeCompare(b.email)
    );

    // Build timeline events
    const timeline: TimelineEvent[] = [
      {
        status: "created",
        dateTime: envelope.createdDateTime || "",
        completed: !!envelope.createdDateTime,
      },
      {
        status: "sent",
        dateTime: envelope.sentDateTime || "",
        completed: !!envelope.sentDateTime,
      },
      {
        status: "delivered",
        dateTime: envelope.deliveredDateTime || "",
        completed: !!envelope.deliveredDateTime,
      },
    ];

    // Check if ALL signers have signed ALL their documents
    const allSignersCompleted = signers.every(signer => 
      signer.signedCount === signer.totalDocuments && signer.totalDocuments > 0
    );
    
    if (allSignersCompleted) {
      // Find the latest sign date (when the last person finished signing)
      const latestSignDate = signers
        .flatMap(signer => 
          signer.documents
            .filter(doc => doc.status === "signed" && doc.signedDateTime)
            .map(doc => doc.signedDateTime!)
        )
        .sort()
        .pop(); // Get the latest date

      timeline.push({
        status: "signed",
        dateTime: latestSignDate || "",
        completed: true,
      });
    } else {
      // If someone has started signing but not everyone is done, show earliest sign date but not completed
      const hasAnySigned = signers.some(signer => signer.signedCount > 0);
      const earliestSignDate = hasAnySigned ? signers
        .flatMap(signer => 
          signer.documents
            .filter(doc => doc.status === "signed" && doc.signedDateTime)
            .map(doc => doc.signedDateTime!)
        )
        .sort()[0] : "";

      timeline.push({
        status: "signed",
        dateTime: earliestSignDate,
        completed: false,
      });
    }

    // Check if envelope is completed
    const isCompleted = envelope.status === "completed";
    timeline.push({
      status: "completed",
      dateTime: isCompleted ? (envelope.completedDateTime || envelope.statusChangedDateTime || "") : "",
      completed: isCompleted,
    });

    const response: EnvelopeSignersStatusResponse = {
      envelopeId,
      status: envelope.status,
      timeline,
      signers,
    };

    return Response.json(response);
  } catch (error) {
    console.error("Error fetching envelope signers status:", error);
    return Response.json(
      { error: "Failed to fetch envelope signers status" },
      { status: 500 }
    );
  }
}