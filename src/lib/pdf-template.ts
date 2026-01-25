import PDFDocument from 'pdfkit';
import type { OfferItem } from './money';
import { formatCurrency } from './money';

interface PdfTemplateProps {
  offerId: string;
  clientName: string;
  companyName?: string;
  email?: string;
  senderName?: string;
  senderSurname?: string;
  currency: string;
  discountPercent: number;
  vatPercent: number;
  validityDays: number;
  notes?: string;
  items: OfferItem[];
  totals: {
    subtotal: number;
    discountAmount: number;
    taxable: number;
    vatAmount: number;
    total: number;
  };
  createdAt: Date;
  validUntil: Date;
}

export function generatePdf(props: PdfTemplateProps): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
  const {
    offerId,
    clientName,
    companyName,
    email,
        senderName,
        senderSurname,
    currency,
    discountPercent,
    vatPercent,
    validityDays,
    notes,
    items,
    totals,
    createdAt,
    validUntil,
  } = props;

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40,
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Header
      doc
        .fontSize(24)
        .fillColor('#4f46e5')
        .text('Your Company Name', { align: 'left' })
        .fontSize(10)
        .fillColor('#666666')
        .text('123 Business Street, City, Country', { align: 'left' })
        .text('Email: info@company.com | Phone: +1 234 567 890', { align: 'left' })
        .moveDown(2);

      // Draw line
      doc
        .strokeColor('#4f46e5')
        .lineWidth(2)
        .moveTo(40, doc.y)
        .lineTo(555, doc.y)
        .stroke()
        .moveDown(2);

      // Offer Info Section
      doc.fontSize(12).fillColor('#333333');
      
      // Left column - Client Information
      const startY = doc.y;
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text('CLIENT INFORMATION', { continued: false })
        .fontSize(12)
        .fillColor('#333333')
        .font('Helvetica-Bold')
        .text(clientName, { continued: false });
      
      if (companyName) {
        doc.font('Helvetica').text(companyName);
      }
      if (email) {
        doc.text(email);
      }
      
      if (senderName || senderSurname) {
        doc.moveDown(1);
        doc.fontSize(10).fillColor('#666666').text('FROM', { continued: false });
        doc.fontSize(12).fillColor('#333333').font('Helvetica').text([senderName, senderSurname].filter(Boolean).join(' '));
      }

      // Right column - Offer Details
      const rightColumnX = 300;
      let rightY = startY;
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text('OFFER DETAILS', rightColumnX, rightY);
      rightY += 15;
      doc
        .fontSize(12)
        .fillColor('#333333')
        .font('Helvetica')
        .text(`Offer #: ${offerId.slice(0, 8)}`, rightColumnX, rightY);
      rightY += 15;
      doc.text(`Date: ${createdAt.toLocaleDateString()}`, rightColumnX, rightY);
      rightY += 15;
      doc.text(`Valid Until: ${validUntil.toLocaleDateString()}`, rightColumnX, rightY);
      rightY += 15;
      doc.text(`Validity: ${validityDays} days`, rightColumnX, rightY);
      
      // Set doc.y to the maximum of left and right columns
      doc.y = Math.max(doc.y, rightY + 20);

      // Move to next section
      doc.moveDown(2);

      // Items Table
      const tableTop = doc.y;
      const itemHeight = 20;
      const tableWidth = 515;
      const colWidths = {
        category: 100,
        item: 200,
        qty: 50,
        unitPrice: 80,
        total: 85,
      };

      // Table Header
      doc
        .fontSize(10)
        .fillColor('#666666')
        .font('Helvetica-Bold')
        .text('Category', 40, tableTop, { width: colWidths.category })
        .text('Item', 140, tableTop, { width: colWidths.item })
        .text('Qty', 340, tableTop, { width: colWidths.qty, align: 'right' })
        .text('Unit Price', 390, tableTop, { width: colWidths.unitPrice, align: 'right' })
        .text('Total', 470, tableTop, { width: colWidths.total, align: 'right' });

      // Draw header line
      doc
        .strokeColor('#e5e7eb')
        .lineWidth(2)
        .moveTo(40, tableTop + 15)
        .lineTo(555, tableTop + 15)
        .stroke();

      // Table Rows
      let currentY = tableTop + 25;
      items.forEach((item) => {
        if (currentY > 700) {
          // New page if needed
          doc.addPage();
          currentY = 40;
        }

        doc
          .fontSize(11)
          .fillColor('#333333')
          .font('Helvetica')
          .text(item.category || 'Other', 40, currentY, { width: colWidths.category })
          .font('Helvetica-Bold')
          .text(item.label, 140, currentY, { width: colWidths.item });
        
        if (item.description) {
          doc
            .fontSize(10)
            .fillColor('#666666')
            .font('Helvetica')
            .text(item.description, 140, currentY + 12, { width: colWidths.item });
        }

        doc
          .fontSize(11)
          .fillColor('#333333')
          .font('Helvetica')
          .text(item.qty.toString(), 340, currentY, { width: colWidths.qty, align: 'right' })
          .text(formatCurrency(item.unitPrice, currency), 390, currentY, { width: colWidths.unitPrice, align: 'right' })
          .font('Helvetica-Bold')
          .text(formatCurrency(item.lineTotal, currency), 470, currentY, { width: colWidths.total, align: 'right' });

        // Draw row line
        doc
          .strokeColor('#e5e7eb')
          .lineWidth(1)
          .moveTo(40, currentY + itemHeight)
          .lineTo(555, currentY + itemHeight)
          .stroke();

        currentY += itemHeight + 5;
      });

      doc.y = currentY + 10;

      // Totals Section
      const totalsX = 355;
      const totalsStartY = doc.y;

      doc
        .fontSize(11)
        .fillColor('#333333')
        .font('Helvetica')
        .text('Subtotal:', totalsX, totalsStartY, { width: 100, align: 'right' })
        .text(formatCurrency(totals.subtotal, currency), totalsX + 100, totalsStartY, { width: 100, align: 'right' });

      if (discountPercent > 0) {
        doc
          .fillColor('#059669')
          .text(`Discount (${discountPercent}%):`, totalsX, doc.y + 5, { width: 100, align: 'right' })
          .text(`-${formatCurrency(totals.discountAmount, currency)}`, totalsX + 100, doc.y - 11, { width: 100, align: 'right' });
      }

      doc
        .fillColor('#333333')
        .text('Taxable:', totalsX, doc.y + 5, { width: 100, align: 'right' })
        .text(formatCurrency(totals.taxable, currency), totalsX + 100, doc.y - 11, { width: 100, align: 'right' });

      if (vatPercent > 0) {
        doc
          .text(`VAT (${vatPercent}%):`, totalsX, doc.y + 5, { width: 100, align: 'right' })
          .text(formatCurrency(totals.vatAmount, currency), totalsX + 100, doc.y - 11, { width: 100, align: 'right' });
      }

      // Total line
      doc
        .strokeColor('#333333')
        .lineWidth(2)
        .moveTo(totalsX, doc.y + 10)
        .lineTo(totalsX + 200, doc.y + 10)
        .stroke();

      doc
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Total:', totalsX, doc.y + 15, { width: 100, align: 'right' })
        .text(formatCurrency(totals.total, currency), totalsX + 100, doc.y - 14, { width: 100, align: 'right' });

      // Notes Section
      if (notes) {
        doc.moveDown(2);
        doc
          .fontSize(10)
          .fillColor('#666666')
          .font('Helvetica-Bold')
          .text('NOTES', { continued: false })
          .fontSize(12)
          .fillColor('#333333')
          .font('Helvetica')
          .text(notes, { align: 'left' });
      }

      // Footer
      doc
        .fontSize(10)
        .fillColor('#666666')
        .text(`This offer is valid until ${validUntil.toLocaleDateString()}`, { align: 'center' })
        .text('Thank you for your business!', { align: 'center' });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
