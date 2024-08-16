const generateRazPdf = async ({captureResponse}) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      let pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.on('error', (err) => {
      reject(err);
    });

    // Extract relevant data
    const payerName = `${captureResponse.card.name}`;
    const payerAddress = `1 Main St, San Jose, CA 95131, US`; // Full address from the shipping details
    const description = `${captureResponse.description}`; 
    const rate = captureResponse.amount/100;
    const amount = rate;
    const total = rate;
    // const datePaid =
    //   orderData.purchase_units[0].payments.captures[0].create_time.split(
    //     'T',
    //   )[0];

    // Add content to the PDF
    // Add header
    doc
      .fontSize(20)
      .fillColor('black') // Set default text color to black
      .text('California Artificial Intelligence Institute', 140, 70) // Adjusted position of text
      .moveDown();

    // Add invoice details
    doc.font('Helvetica-Bold').fontSize(13).text('Invoice', 50, 120);
    doc
      .fillColor('black')
      .fontSize(10)
      .text(`Invoice number: ${captureResponse.invoice_id}`, 50, 140);
    doc
      .fillColor('black')
      .fontSize(10)
      .text(
        `Transaction ID: ${captureResponse.id}`,
        50,
        155,
      );
    doc
      .fillColor('black')
      .fontSize(10)
      .text(`Payment Date: ${datePaid}`, 50, 170);
    doc.fillColor('black').fontSize(10).text(`Payment method: PayPal`, 50, 185);

    // Add billing details
    doc.font('Helvetica-Bold').fontSize(13).text('Bill to', 400, 120);
    doc.fillColor('black').fontSize(10).text(payerName, 400, 140);
    doc.fillColor('black').fontSize(10).text(payerAddress, 400, 155);

    // Add table header
    doc.moveDown();
    doc.font('Helvetica-Bold').fontSize(13).text('NO', 50, 250, { width: 50 });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('DESCRIPTION', 100, 250, { width: 200 });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('RATE', 300, 250, { width: 100 });
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('AMOUNT', 400, 250, { width: 100 });

      // Add table row
    doc.fontSize(10).text('1', 50, 270, { width: 50 });
    doc.fontSize(10).text(description, 100, 270, { width: 200 });
    doc.fontSize(10).text(`$ ${rate}`, 300, 270, { width: 100 });
    doc.fontSize(10).text(`$ ${amount}`, 400, 270, { width: 100 });

    // Add total
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .text('Total', 300, 300, { width: 100 });
    doc.fontSize(10).text(`$ ${total}`, 400, 300, { width: 100 });

    doc.end();

  });
};
