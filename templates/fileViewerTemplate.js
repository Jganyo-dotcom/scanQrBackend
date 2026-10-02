
export const fileViewerTemplate = (campaignName, imageUrl, shortId) => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>View Shared Asset — DevJay QR</title>
      <style>
        * { box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
          background-color: #f8fafc; 
          margin: 0; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          min-height: 100vh; 
          padding: 1.5rem; 
        }
        .viewer-card { 
          background: #ffffff; 
          padding: 2.5rem 2rem; 
          border-radius: 16px; 
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02); 
          max-width: 440px; 
          width: 100%; 
          text-align: center; 
          border: 1px solid #e2e8f0; 
        }
        .icon-banner {
          font-size: 2.5rem;
          margin-bottom: 0.5rem;
        }
        h2 { 
          color: #0f172a; 
          margin: 0 0 0.5rem 0; 
          font-size: 1.5rem; 
          letter-spacing: -0.025em; 
          font-weight: 700;
        }
        p { 
          color: #64748b; 
          font-size: 0.9rem; 
          margin: 0 0 1.5rem 0; 
          line-height: 1.5;
        }
        p strong {
          color: #1e293b;
        }
        .img-container {
          background-color: #f8fafc;
          border: 1px solid #f1f5f9;
          border-radius: 12px;
          padding: 0.5rem;
          margin-bottom: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .img-frame { 
          max-width: 100%; 
          max-height: 280px; 
          border-radius: 8px; 
          object-fit: contain; 
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.03); 
        }
        .btn-download { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 0.5rem; 
          width: 100%; 
          padding: 0.85rem 1.5rem; 
          background-color: #2563eb; 
          color: #ffffff; 
          border: none;
          border-radius: 8px; 
          font-weight: 600; 
          font-size: 0.95rem; 
          box-shadow: 0 4px 14px 0 rgba(37, 99, 235, 0.3); 
          transition: all 0.15s ease; 
          cursor: pointer;
        }
        .btn-download:hover { 
          background-color: #1d4ed8; 
          transform: translateY(-1px);
          box-shadow: 0 6px 20px 0 rgba(37, 99, 235, 0.4); 
        }
        .btn-download:active {
          transform: translateY(0);
        }
        .footer-brand { 
          margin-top: 2rem; 
          font-size: 0.7rem; 
          color: #94a3b8; 
          letter-spacing: 0.075em; 
          text-transform: uppercase; 
          font-weight: 600; 
        }
      </style>
    </head>
    <body>
      <div class="viewer-card">
        <div class="icon-banner">📦</div>
        <h2>File Shared Successfully</h2>
        <p>Campaign Item: <strong>${campaignName}</strong></p>
        
        <div class="img-container">
          <img src="${imageUrl}" class="img-frame" alt="Scanned file preview layout" />
        </div>
        
        <!-- 🚀 DOWNLOAD BLOB TRIGGER: Forces cross-origin browser downloads to pop cleanly -->
        <button id="downloadBtn" class="btn-download">
          💾 Save File to Device
        </button>
        
        <div class="footer-brand">Powered by DevJay QR</div>
      </div>

      <script>
        document.getElementById('downloadBtn').addEventListener('click', async () => {
          const button = document.getElementById('downloadBtn');
          const originalText = button.innerHTML;
          
          try {
            button.disabled = true;
            button.innerHTML = '⏳ Processing Download...';
            
            // Fetch the image binary buffer directly to bypass cross-origin browser lockups
            const response = await fetch("${imageUrl}");
            const blob = await response.blob();
            
            // Instantiates a native click simulation pipeline window on the smartphone device
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = "shared-file-${shortId}.png";
            
            document.body.appendChild(link);
            link.click();
            
            // Teardown the virtual nodes
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
          } catch (err) {
            console.error('Download bridge failure, executing fallback redirect:', err);
            window.open("${imageUrl}", '_blank');
          } finally {
            button.disabled = false;
            button.innerHTML = originalText;
          }
        });
      </script>
    </body>
    </html>
  `;
};
