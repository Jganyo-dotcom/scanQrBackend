// @desc    Server-Side Rendered (SSR) HTML Mobile Landing Page for Digital business cards (vCard)
export const vCardViewerTemplate = (campaignName, vCardRawText, shortId) => {
  // Clean string line breaks to handle standard or compressed vCard parameters smoothly
  const normalizedText = vCardRawText.replace(/END:VCARD/i, "\nEND:VCARD");
  const vCardLines = normalizedText.split(/\r?\n/);

  // Helper function to find a specific key prefix line and extract its value
  const getVCardValue = (prefix) => {
    const targetLine = vCardLines.find((line) =>
      line.toUpperCase().trim().startsWith(prefix.toUpperCase()),
    );
    if (!targetLine) return "";
    return targetLine.substring(targetLine.indexOf(":") + 1).trim();
  };

  // Extract raw text parameters natively out of your vCard payload
  let fullName = getVCardValue("N:");
  const phoneNumber = getVCardValue("TEL") || "No phone listed";

  // 🚀 FIXED: Checks for standard "EMAIL:" or your layout's custom "Email:" prefix fields
  let rawEmail = getVCardValue("EMAIL") || getVCardValue("Email") || "";
  const emailAddress = rawEmail.toUpperCase().includes("END:VCARD")
    ? rawEmail.substring(0, rawEmail.toUpperCase().indexOf("END:VCARD")).trim()
    : rawEmail.trim();
  const orgName = getVCardValue("ORG") || "Digital Contact Card";

  // Clean up semicolon naming conventions if saved as "Ganyo;James"
  if (fullName.includes(";")) {
    fullName = fullName.split(";").reverse().join(" ").trim();
  }

  // Fallback to campaign name if the name field parsed incorrectly
  if (!fullName || fullName.toUpperCase() === "VCARD") {
    fullName = campaignName;
  }

  // Sanitize raw text to prevent it from crashing the client-side download button script
  const sanitizedVCardText = normalizedText
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/\r?\n/g, "\\n");

  // Generate the initial letter bubble asset character
  const initialLetter = fullName.charAt(0).toUpperCase();

  // 🚀 CLEAN CONDITIONAL BLOCK: Renders the Email row beautifully if available
  let emailHtmlRow = "";
  if (emailAddress && emailAddress !== "No email listed") {
    emailHtmlRow = `
      <div class="info-row">
        <span class="info-label">Email Address</span>
        <span class="info-value">${emailAddress}</span>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connect with ${fullName} — DevJay QR</title>
      <style>
        * { box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f8fafc; margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 1.5rem; }
        .vcard-card { background: #ffffff; padding: 2.5rem 2rem; border-radius: 16px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05); max-width: 400px; width: 100%; text-align: center; border: 1px solid #e2e8f0; }
        .avatar-frame { width: 80px; height: 80px; background-color: #eff6ff; color: #2563eb; font-size: 2rem; font-weight: 700; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1rem; border: 2px solid #dbeafe; text-transform: uppercase; }
        h2 { color: #0f172a; margin: 0 0 0.25rem 0; font-size: 1.5rem; font-weight: 700; letter-spacing: -0.025em; }
        .org-label { color: #2563eb; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; margin-bottom: 1.5rem; letter-spacing: 0.05em; }
        .info-box { background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; padding: 1.25rem 1rem; margin-bottom: 1.5rem; text-align: left; }
        .info-row { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.85rem; }
        .info-row:last-child { margin-bottom: 0; }
        .info-label { font-size: 0.725rem; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.025em; }
        .info-value { font-size: 0.95rem; color: #334155; font-weight: 500; word-break: break-all; }
        .btn-save { display: flex; align-items: center; justify-content: center; gap: 0.5rem; width: 100%; padding: 0.85rem 1.5rem; background-color: #2563eb; color: #ffffff; border: none; border-radius: 8px; font-weight: 600; font-size: 0.95rem; box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3); transition: all 0.15s ease; cursor: pointer; }
        .btn-save:hover { background-color: #1d4ed8; transform: translateY(-1px); }
        .footer-brand { margin-top: 2rem; font-size: 0.7rem; color: #94a3b8; letter-spacing: 0.075em; text-transform: uppercase; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="vcard-card">
        <div class="avatar-frame">${initialLetter}</div>
        <h2>${fullName}</h2>
        <div class="org-label">${orgName}</div>
        
        <div class="info-box">
          <div class="info-row">
            <span class="info-label">Mobile Number</span>
            <span class="info-value">${phoneNumber}</span>
          </div>
          ${emailHtmlRow}
        </div>
        
        <button id="saveContactBtn" class="btn-save">
          👤 Save Contact to Phone
        </button>
        
        <div class="footer-brand">Powered by DevJay QR</div>
      </div>

      <script>
        document.getElementById('saveContactBtn').addEventListener('click', () => {
          const vcardData = '${sanitizedVCardText}';
          const blob = new Blob([vcardData], { type: 'text/vcard;charset=utf-8;' });
          const blobUrl = window.URL.createObjectURL(blob);
          
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = "${fullName.replace(/\s+/g, "_")}_contact.vcf";
          
          document.body.appendChild(link);
          link.click();
          
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        });
      </script>
    </body>
    </html>
  `;
};
