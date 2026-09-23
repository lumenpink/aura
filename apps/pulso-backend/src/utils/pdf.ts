import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/**
 * Resolves the PDF base template from Cache API or R2 bucket.
 */
export async function getTemplateBytes(env: any): Promise<ArrayBuffer | null> {
  const cacheUrl = 'http://pulso-api.localhost:12402/templates/base-receituario.pdf';
  // Cache API is available in Cloudflare Worker environment
  const cache = typeof caches !== 'undefined' ? (caches as any).default : null;
  
  if (cache) {
    try {
      const cachedResponse = await cache.match(cacheUrl);
      if (cachedResponse) {
        return await cachedResponse.arrayBuffer();
      }
    } catch (e) {
      console.warn("Cache match failed:", e);
    }
  }

  // Fallback to read from R2
  if (env.SYNC_BUCKET) {
    try {
      const object = await env.SYNC_BUCKET.get('base-receituario.pdf');
      if (object) {
        const bytes = await object.arrayBuffer();
        
        // Store in Cache for future calls
        if (cache) {
          try {
            const response = new Response(bytes.slice(0), {
              headers: {
                'Content-Type': 'application/pdf',
                'Cache-Control': 'public, max-age=86400, s-maxage=86400',
              }
            });
            await cache.put(cacheUrl, response);
          } catch (e) {
            console.warn("Cache put failed:", e);
          }
        }
        return bytes;
      }
    } catch (err) {
      console.warn("R2 read failed, will use fallback generation:", err);
    }
  }

  return null;
}

/**
 * Renders the prescription PDF by overlaying dynamic details on top of the base template.
 * If base template is not provided, it generates a beautiful, compliant document from scratch.
 */
export async function generatePrescriptionPdf(
  templateBytes: ArrayBuffer | null,
  data: any
): Promise<Uint8Array> {
  let pdfDoc: PDFDocument;
  
  if (templateBytes && templateBytes.byteLength > 0) {
    try {
      pdfDoc = await PDFDocument.load(templateBytes);
    } catch (e) {
      console.warn("Failed to load template bytes, drawing programmatically", e);
      pdfDoc = await PDFDocument.create();
    }
  } else {
    pdfDoc = await PDFDocument.create();
  }

  let pages = pdfDoc.getPages();
  let firstPage = pages[0];
  
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  if (!firstPage) {
    firstPage = pdfDoc.addPage([595.27, 841.89]);
    
    // Visual layout and header elements
    firstPage.drawRectangle({
      x: 40,
      y: 750,
      width: 515.27,
      height: 50,
      color: rgb(0.49, 0.23, 0.93), // Premium purple #7c3aed
    });
    
    firstPage.drawText("AURA CLINIC - RECEITUÁRIO MÉDICO", {
      x: 60,
      y: 770,
      size: 14,
      font: helveticaBold,
      color: rgb(1, 1, 1),
    });
    
    firstPage.drawRectangle({
      x: 40,
      y: 30,
      width: 515.27,
      height: 25,
      color: rgb(0.95, 0.95, 0.96),
    });
    
    firstPage.drawText("Documento assinado digitalmente nos termos da ICP-Brasil. Validar em validacao.iti.gov.br", {
      x: 50,
      y: 38,
      size: 8,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    firstPage.drawRectangle({
      x: 40,
      y: 70,
      width: 515.27,
      height: 670,
      borderColor: rgb(0.88, 0.88, 0.9),
      borderWidth: 1,
    });
  }

  // Draw Patient Details
  const patientName = data.patientName || data.patient?.name || 'Não Informado';
  const patientCpf = data.patientCpf || data.patient?.cpf || 'Não Informado';
  const patientBirthdate = data.patientBirthdate || data.patient?.birthdate || '';

  firstPage.drawText(`PACIENTE: ${patientName}`, {
    x: 80,
    y: 690,
    size: 11,
    font: helveticaBold,
    color: rgb(0.12, 0.12, 0.14)
  });

  firstPage.drawText(`CPF: ${patientCpf}${patientBirthdate ? `  |  Nascimento: ${patientBirthdate}` : ''}`, {
    x: 80,
    y: 675,
    size: 9,
    font: helveticaFont,
    color: rgb(0.3, 0.3, 0.3)
  });

  firstPage.drawLine({
    start: { x: 80, y: 660 },
    end: { x: 515, y: 660 },
    thickness: 1,
    color: rgb(0.88, 0.88, 0.9)
  });

  // Draw Medication Items
  let currentY = 620;
  let currentPage = firstPage;
  
  const items = data.items || [];
  for (const item of items) {
    if (currentY < 220) {
      if (pdfDoc.getPageCount() > 0) {
        const [copiedPage] = await pdfDoc.copyPages(pdfDoc, [0]);
        pdfDoc.addPage(copiedPage);
        currentPage = copiedPage;
      } else {
        currentPage = pdfDoc.addPage([595.27, 841.89]);
      }
      currentY = 700;
    }

    currentPage.drawText(`${item.medicationName} (${item.concentration || ''}) - Qtd: ${item.quantity || ''}`, {
      x: 80,
      y: currentY,
      size: 11,
      font: helveticaBold,
      color: rgb(0.12, 0.12, 0.14)
    });
    
    currentPage.drawText(item.instructions || '', {
      x: 95,
      y: currentY - 15,
      size: 9,
      font: helveticaFont,
      color: rgb(0.4, 0.4, 0.4)
    });
    
    currentY -= 45;
  }

  // Draw Prescribing Doctor details
  const doctorName = data.doctorName || data.prescriber?.name || '';
  const doctorCrm = data.doctorCrm || data.prescriber?.crm || '';
  const doctorCrmUf = data.doctorCrmUf || data.prescriber?.crmUf || '';
  
  currentPage.drawText(`Dr(a). ${doctorName}`, {
    x: 80,
    y: 160,
    size: 10,
    font: helveticaBold,
    color: rgb(0.12, 0.12, 0.14)
  });
  
  currentPage.drawText(`CRM: ${doctorCrm}-${doctorCrmUf} (Assinatura Eletrônica)`, {
    x: 80,
    y: 145,
    size: 9,
    font: helveticaFont,
    color: rgb(0.4, 0.4, 0.4)
  });

  // If digital signature is present, overlay sign badge
  if (data.digitalSignature) {
    currentPage.drawRectangle({
      x: 80,
      y: 90,
      width: 435,
      height: 35,
      color: rgb(0.96, 0.98, 0.96),
      borderColor: rgb(0.18, 0.64, 0.34),
      borderWidth: 1
    });

    currentPage.drawText(`✓ DOCUMENTO ASSINADO DIGITALMENTE - ITI / ICP-BRASIL`, {
      x: 90,
      y: 112,
      size: 8,
      font: helveticaBold,
      color: rgb(0.18, 0.64, 0.34)
    });

    currentPage.drawText(`Assinatura Digital (CMS/PKCS#7): ${data.digitalSignature.substring(0, 60)}...`, {
      x: 90,
      y: 100,
      size: 7,
      font: helveticaFont,
      color: rgb(0.3, 0.3, 0.3)
    });
  }

  return await pdfDoc.save();
}
