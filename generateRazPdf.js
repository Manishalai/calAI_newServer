const PDFDocument = require('pdfkit');

async function generatePdf(captureResponse) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.on('error', (err) => {
      reject(err);
    });

    // Extract relevant data
    const transactionId = captureResponse.id;
    const orderId = captureResponse.order_id;
    const amount = (captureResponse.amount / 100).toFixed(2); // Convert to correct currency format
    const currency = captureResponse.currency;
    const paymentMethod = captureResponse.method.toUpperCase();
    const programDescription = captureResponse.description;
    const payerEmail = captureResponse.email;
    const payerContact = captureResponse.contact;
    const program = captureResponse.notes.program;
    const gstIncluded = captureResponse.notes.gstIncluded;
    const basePrice = captureResponse.notes.basePrice;
    const datePaid = new Date(
      captureResponse.created_at * 1000,
    ).toLocaleDateString('en-IN');

    // Add header
    doc
      .image('public/images/Calaiorign.jpg', 50, 45, { width: 50 })
      .fontSize(20)
      .fillColor('black') // Set default text color to black
      .text('California Artificial Intelligence Institute', 140, 70) // Adjusted position of text
      .moveDown();

    // Add invoice details
    doc.font('Helvetica-Bold').fontSize(13).text('Invoice', 50, 120);
    doc
      .fillColor('black')
      .fontSize(10)
      .text(`Invoice number: ${orderId}`, 50, 140);
    doc
      .fillColor('black')
      .fontSize(10)
      .text(`Transaction ID: ${transactionId}`, 50, 155);
    doc
      .fillColor('black')
      .fontSize(10)
      .text(`Payment Date: ${datePaid}`, 50, 170);
    doc
      .fillColor('black')
      .fontSize(10)
      .text(`Payment method: ${paymentMethod}`, 50, 185);

    // Add billing details
    doc.font('Helvetica-Bold').fontSize(13).text('Bill to', 380, 120);
    doc.fillColor('black').fontSize(10).text(payerEmail, 380, 140);
    doc.fillColor('black').fontSize(10).text(payerContact, 380, 155);

    // Add table header
    doc.moveDown();
    doc.rect(50, 240, 500, 20).fill('#f0f0f0').stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#5c5b5b')
      .text('Description', 60, 245, { width: 200 });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#5c5b5b')
      .text('Amount', 400, 245, { width: 100 });

    // Add table row with increased vertical spacing and bottom line
    let yPosition = 270;
    const rowHeight = 45; // Increase the row height

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(programDescription, 60, yPosition, { width: 200 });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(`${currency} ${currency === 'INR' ? amount - gstIncluded : amount}`, 400, yPosition, { width: 100 });

    // Draw bottom line under the first row
    doc.moveTo(50, yPosition + rowHeight - 10).lineTo(550, yPosition + rowHeight - 10).strokeColor('gray').stroke();

    if (currency === 'INR') {
      yPosition += rowHeight;
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('black')
        .text('18% GST Included', 60, yPosition, { width: 200 });
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('black')
        .text(`${currency} ${gstIncluded}`, 400, yPosition, { width: 100 });

      // Draw bottom line under the GST row
      doc.moveTo(50, yPosition + rowHeight - 10).lineTo(550, yPosition + rowHeight - 10).strokeColor('gray').stroke();
    }

    // Add total
    yPosition += rowHeight;
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('black')
      .text('Total', 60, yPosition, { width: 100 });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('black')
      .text(`${currency} ${amount}`, 400, yPosition, { width: 100 });

    // Draw bottom line under the total row
    doc.moveTo(50, yPosition + rowHeight - 10).lineTo(550, yPosition + rowHeight - 10).strokeColor('gray').stroke();

    doc.end();
  });
}

module.exports = generatePdf;
