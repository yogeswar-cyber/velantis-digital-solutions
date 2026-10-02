/**
 * Brand-consistent HTML email wrapper for VELANTIS DIGITAL SOLUTIONS.
 * Matches #111827 dark headers, #ff5a00 brand orange, and clean typography.
 */
function emailLayout({ title, previewText, content }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; }
    .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 15px rgba(0,0,0,0.04); }
    .header { background-color: #111827; padding: 28px 32px; text-align: left; }
    .header-badge { background-color: #ff5a00; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase; }
    .header-sub { color: #9ca3af; font-size: 12px; margin-top: 6px; }
    .content { padding: 36px 32px; font-size: 15px; line-height: 1.6; color: #374151; }
    .banner { background-color: #fff7ed; border: 1.5px dashed #ff5a00; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0; }
    .banner-title { font-size: 11px; font-weight: 700; color: #c2410c; text-transform: uppercase; letter-spacing: 1px; }
    .banner-code { font-family: monospace; font-size: 26px; font-weight: 800; color: #ff5a00; letter-spacing: 1px; margin: 6px 0; }
    .details-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    .details-table td { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; font-size: 14px; }
    .details-table td.label { color: #6b7280; width: 35%; font-weight: 500; }
    .details-table td.val { color: #111827; font-weight: 600; }
    .btn { display: inline-block; background-color: #ff5a00; color: #ffffff !important; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: 700; font-size: 14px; margin-top: 15px; }
    .footer { background-color: #fafafa; padding: 24px 32px; border-top: 1px solid #f3f4f6; text-align: center; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#333;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${previewText}
  </div>
  <div class="container">
    <div class="header">
      <span class="header-badge">VELANTIS</span>
      <div class="header-sub">DIGITAL SOLUTIONS & ENGINEERING</div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;"><b>VELANTIS Digital Solutions</b> &bull; Engineering with precision</p>
      <p style="margin: 0;">hello@velantis.in &bull; +91 98765 43210 &bull; www.velantis.in</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1. Client Project Confirmation Email
 */
export function renderProjectConfirmationClient({ project, serviceName, featureNames = [] }) {
  const subject = `Project Request Received — ${project.referenceNumber} | VELANTIS`;
  const previewText = `We have received your request (${project.referenceNumber}) and our engineering team will get back to you within 24 hours.`;

  const featuresList = featureNames.length > 0
    ? `<tr><td class="label">Features:</td><td class="val">${featureNames.join(', ')}</td></tr>`
    : '';

  const html = emailLayout({
    title: subject,
    previewText,
    content: `
      <h2 style="margin-top:0; color:#111827; font-size:22px;">Thank you, ${project.clientName}.</h2>
      <p>We have successfully received your project request at VELANTIS. Our technical team is reviewing your requirements and will reach out with a tailored plan, timeline, and quote.</p>
      
      <div class="banner">
        <div class="banner-title">Your Authoritative Reference Number</div>
        <div class="banner-code">${project.referenceNumber}</div>
        <small style="color:#6b7280;">Please save this reference for all communications with our team.</small>
      </div>

      <h3 style="font-size:15px; color:#111827; margin:24px 0 10px 0;">Submitted Project Scope</h3>
      <table class="details-table">
        <tr><td class="label">Service:</td><td class="val">${serviceName}</td></tr>
        ${project.budgetRange ? `<tr><td class="label">Budget Range:</td><td class="val">${project.budgetRange}</td></tr>` : ''}
        ${project.timeline ? `<tr><td class="label">Desired Timeline:</td><td class="val">${project.timeline}</td></tr>` : ''}
        ${featuresList}
      </table>

      <p style="font-size:13px; color:#6b7280; margin-top:20px;">
        <strong>What happens next?</strong><br>
        1. Our engineering team conducts a technical feasibility and scope review.<br>
        2. We prepare an initial milestone breakdown and clear pricing.<br>
        3. A solutions engineer will contact you directly within 24 business hours.
      </p>

      <p style="margin-top:28px;">
        Warm regards,<br>
        <strong>VELANTIS Engineering Team</strong>
      </p>
    `,
  });

  const text = `
Hello ${project.clientName},

Thank you for reaching out to VELANTIS Digital Solutions. We have received your project request.

Your Reference Number: ${project.referenceNumber}
Service: ${serviceName}
${project.budgetRange ? `Budget: ${project.budgetRange}\n` : ''}${project.timeline ? `Timeline: ${project.timeline}\n` : ''}
Our team will review your specifications and get in touch within 24 business hours.

VELANTIS Digital Solutions
hello@velantis.in | +91 98765 43210
  `.trim();

  return { subject, html, text };
}

/**
 * 2. Team Notification for New Project
 */
export function renderProjectNotificationTeam({ project, serviceName, featureNames = [], adminUrl }) {
  const subject = `🚀 New Project Booked: ${project.referenceNumber} (${project.clientName})`;
  const previewText = `New project request from ${project.clientName} for ${serviceName} (${project.referenceNumber})`;

  const html = emailLayout({
    title: subject,
    previewText,
    content: `
      <h2 style="margin-top:0; color:#111827; font-size:20px;">New Project Request Submitted</h2>
      <p>A new client has submitted a structured project inquiry via the booking form.</p>

      <table class="details-table">
        <tr><td class="label">Reference:</td><td class="val" style="color:#ff5a00; font-family:monospace;">${project.referenceNumber}</td></tr>
        <tr><td class="label">Client Name:</td><td class="val">${project.clientName}</td></tr>
        <tr><td class="label">Client Email:</td><td class="val"><a href="mailto:${project.clientEmail}">${project.clientEmail}</a></td></tr>
        <tr><td class="label">Phone:</td><td class="val">${project.clientPhone || 'Not provided'}</td></tr>
        <tr><td class="label">Company:</td><td class="val">${project.companyName || 'Not provided'}</td></tr>
        <tr><td class="label">Service:</td><td class="val">${serviceName}</td></tr>
        <tr><td class="label">Budget:</td><td class="val">${project.budgetRange || 'Not specified'}</td></tr>
        <tr><td class="label">Timeline:</td><td class="val">${project.timeline || 'Not specified'}</td></tr>
        <tr><td class="label">Features (${featureNames.length}):</td><td class="val">${featureNames.join(', ') || 'None selected'}</td></tr>
      </table>

      <h4 style="margin:16px 0 6px 0; color:#374151;">Project Description:</h4>
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px; font-size:14px; color:#1f2937; white-space:pre-wrap;">
        ${project.description}
      </div>

      <div style="text-align:center; margin-top:24px;">
        <a href="${adminUrl}" class="btn">Open in Admin Portal &rarr;</a>
      </div>
    `,
  });

  const text = `
NEW PROJECT BOOKED: ${project.referenceNumber}
Client: ${project.clientName} (${project.clientEmail})
Phone: ${project.clientPhone || 'N/A'} | Company: ${project.companyName || 'N/A'}
Service: ${serviceName}
Budget: ${project.budgetRange || 'N/A'} | Timeline: ${project.timeline || 'N/A'}

Description:
${project.description}

Manage in Admin: ${adminUrl}
  `.trim();

  return { subject, html, text };
}

/**
 * 3. Client Contact Confirmation Email
 */
export function renderContactConfirmationClient({ contactMessage }) {
  const subject = `We received your message — VELANTIS Digital Solutions`;
  const previewText = `Thank you for contacting VELANTIS. We have received your inquiry and will reply soon.`;

  const html = emailLayout({
    title: subject,
    previewText,
    content: `
      <h2 style="margin-top:0; color:#111827; font-size:22px;">Hello ${contactMessage.name},</h2>
      <p>Thank you for reaching out to VELANTIS Digital Solutions. We have received your message regarding <strong>"${contactMessage.subject}"</strong>.</p>
      
      <div style="background:#f9fafb; border-left:4px solid #ff5a00; border-radius:4px; padding:14px 18px; margin:20px 0; font-size:14px; color:#4b5563;">
        <em>"${contactMessage.message}"</em>
      </div>

      <p>A member of our team will review your inquiry and respond to you at <strong>${contactMessage.email}</strong> within 24 hours.</p>

      <p style="margin-top:28px;">
        Best regards,<br>
        <strong>VELANTIS Team</strong>
      </p>
    `,
  });

  const text = `
Hello ${contactMessage.name},

Thank you for reaching out to VELANTIS Digital Solutions. We have received your message regarding "${contactMessage.subject}".

Our team will respond to you at ${contactMessage.email} within 24 hours.

VELANTIS Digital Solutions
hello@velantis.in
  `.trim();

  return { subject, html, text };
}

/**
 * 4. Team Notification for Contact Inquiry
 */
export function renderContactNotificationTeam({ contactMessage, adminUrl }) {
  const subject = `💬 New Inquiry: ${contactMessage.subject} from ${contactMessage.name}`;
  const previewText = `New contact message from ${contactMessage.name} (${contactMessage.email})`;

  const html = emailLayout({
    title: subject,
    previewText,
    content: `
      <h2 style="margin-top:0; color:#111827; font-size:20px;">New Contact Message Received</h2>

      <table class="details-table">
        <tr><td class="label">Sender:</td><td class="val">${contactMessage.name}</td></tr>
        <tr><td class="label">Email:</td><td class="val"><a href="mailto:${contactMessage.email}">${contactMessage.email}</a></td></tr>
        <tr><td class="label">Subject:</td><td class="val">${contactMessage.subject}</td></tr>
        ${contactMessage.projectType ? `<tr><td class="label">Project Type:</td><td class="val">${contactMessage.projectType}</td></tr>` : ''}
      </table>

      <h4 style="margin:16px 0 6px 0; color:#374151;">Message:</h4>
      <div style="background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:14px; font-size:14px; color:#1f2937; white-space:pre-wrap;">
        ${contactMessage.message}
      </div>

      <div style="text-align:center; margin-top:24px;">
        <a href="${adminUrl}" class="btn">Triage in Admin Portal &rarr;</a>
      </div>
    `,
  });

  const text = `
NEW INQUIRY RECEIVED
Sender: ${contactMessage.name} (${contactMessage.email})
Subject: ${contactMessage.subject}
${contactMessage.projectType ? `Project Type: ${contactMessage.projectType}\n` : ''}
Message:
${contactMessage.message}

Admin Portal: ${adminUrl}
  `.trim();

  return { subject, html, text };
}
