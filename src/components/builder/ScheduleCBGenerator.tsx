'use client'

/**
 * Schedule C-B PDF Generator
 *
 * Generates a printable British Columbia Building Code Field Review Report.
 * Opens in a new window and auto-triggers the print dialog.
 */

interface ScheduleCBProject {
  id: string
  name: string
  address: string
  cp_name: string
  status?: string
  certRef?: string
  stage?: string
  permitNumber?: string
  city?: string
}

export function downloadScheduleCB(project: ScheduleCBProject) {
  const result = project.status === 'fail' ? 'FAILED ✗' : 'PASSED ✓'
  const resultColor = project.status === 'fail' ? '#cc0000' : '#16a34a'
  const certRef = project.certRef ?? `VERO-IC-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  const stage = project.stage ?? 'Field Review'
  const permitNumber = project.permitNumber ?? 'N/A'
  const city = project.city ?? ''

  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups to download the Schedule C-B.')
    return
  }

  win.document.write(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <title>Schedule C-B — ${project.address}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          color: #111;
          padding: 40px;
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          border-bottom: 3px solid #000;
          margin-bottom: 24px;
          padding-bottom: 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .header-text { flex: 1; }
        .header h1 { font-size: 22px; font-weight: bold; letter-spacing: 2px; }
        .header p { font-size: 11px; color: #444; margin-top: 4px; }
        .seal {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #047857 0%, #059669 30%, #0d9488 55%, #10b981 75%, #065f46 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          text-align: center;
          font-weight: bold;
          border: 4px solid rgba(255,255,255,0.5);
          outline: 3px solid #059669;
          box-shadow: 0 0 0 1px #047857, 0 4px 24px rgba(5,150,105,0.45), inset 0 1px 0 rgba(255,255,255,0.25);
          line-height: 1.4;
          flex-shrink: 0;
          margin-left: 20px;
          position: relative;
          overflow: hidden;
        }
        .seal::before {
          content: '';
          position: absolute;
          top: -40%;
          left: -40%;
          width: 80%;
          height: 80%;
          background: radial-gradient(ellipse, rgba(255,255,255,0.22) 0%, transparent 70%);
          border-radius: 50%;
        }
        .section {
          margin-bottom: 20px;
          border: 1px solid #ccc;
          border-radius: 4px;
          overflow: hidden;
        }
        .section-title {
          background: #1a1a2e;
          color: white;
          padding: 8px 12px;
          font-size: 11px;
          font-weight: bold;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .section-body { padding: 12px; }
        .field-row {
          display: flex;
          padding: 6px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        .field-row:last-child { border-bottom: none; }
        .field-label {
          width: 200px;
          font-weight: bold;
          color: #555;
          flex-shrink: 0;
        }
        .field-value { flex: 1; }
        .result-box {
          display: inline-block;
          padding: 8px 20px;
          border-radius: 4px;
          font-weight: bold;
          font-size: 16px;
          color: white;
          background: ${resultColor};
          margin: 12px 0;
        }
        .cert-ref {
          font-family: monospace;
          font-size: 11px;
          background: #f5f5f5;
          border: 1px solid #ddd;
          padding: 4px 8px;
          border-radius: 3px;
          display: inline-block;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 2px solid #000;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          font-size: 10px;
          color: #555;
        }
        .signature-block {
          border-top: 1px solid #000;
          width: 220px;
          padding-top: 4px;
          text-align: center;
        }
        .legal-note {
          font-size: 9px;
          color: #666;
          margin-top: 16px;
          line-height: 1.6;
          border: 1px solid #ddd;
          padding: 10px;
          background: #fafafa;
        }
        @media print {
          body { padding: 20px; }
          button { display: none; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-text">
          <h1>SCHEDULE C-B</h1>
          <p>British Columbia Building Code — Field Review Report</p>
          <p style="margin-top:6px; font-size:10px; color:#777;">
            Issued under Part 5, Division B of the British Columbia Building Code (BCBC)
          </p>
        </div>
        <div class="seal">
          <img src="${window.location.origin}/vero-logo-dark.png" alt="Vero" style="width:56px;height:56px;object-fit:contain;filter:brightness(0) invert(1);" />
        </div>
      </div>

      <div class="section">
        <div class="section-title">Certificate Information</div>
        <div class="section-body">
          <div class="field-row">
            <div class="field-label">Certificate Reference</div>
            <div class="field-value"><span class="cert-ref">${certRef}</span></div>
          </div>
          <div class="field-row">
            <div class="field-label">Date of Inspection</div>
            <div class="field-value">${new Date().toLocaleDateString('en-CA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Time of Report</div>
            <div class="field-value">${new Date().toLocaleTimeString('en-CA', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Project Information</div>
        <div class="section-body">
          <div class="field-row">
            <div class="field-label">Project Name</div>
            <div class="field-value">${project.name}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Site Address</div>
            <div class="field-value">${project.address}${city ? ', ' + city : ''}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Permit Number</div>
            <div class="field-value">${permitNumber}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Inspection Stage</div>
            <div class="field-value">${stage}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Coordinating Registered Professional (CP)</div>
        <div class="section-body">
          <div class="field-row">
            <div class="field-label">CP Name</div>
            <div class="field-value">${project.cp_name}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Registration Body</div>
            <div class="field-value">Engineers and Geoscientists BC (EGBC) / AIBC</div>
          </div>
          <div class="field-row">
            <div class="field-label">Field Review Type</div>
            <div class="field-value">On-site inspection per Vero dispatch</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">Field Review Result</div>
        <div class="section-body">
          <div class="result-box">${result}</div>
          <div class="field-row" style="margin-top: 8px;">
            <div class="field-label">Status</div>
            <div class="field-value" style="font-weight:bold; color:${resultColor};">${result}</div>
          </div>
          <div class="field-row">
            <div class="field-label">Report ID</div>
            <div class="field-value"><span class="cert-ref">${certRef}</span></div>
          </div>
          <div class="field-row">
            <div class="field-label">Location / device</div>
            <div class="field-value">Recorded in inspection record when available</div>
          </div>
        </div>
      </div>

      <div class="legal-note">
        <strong>Legal Notice:</strong> This Schedule C-B is a field review report issued pursuant to the British Columbia Building Code (BCBC). 
        The coordinating registered professional (CP) certifies that this field review was conducted in accordance with the applicable sections 
        of the BCBC and the CP's professional obligations under the Engineers and Geoscientists Act (RSBC 2018, c.21) or Architects Act (RSBC 1996, c.17). 
        This report is generated from the inspection record. Tampering with professional field review reports may violate BC law and professional regulations.
        <br><br>
        Generated by Vero Technologies Inc. — getvero.ca · Vancouver, BC
      </div>

      <div class="footer">
        <div>
          <div style="margin-bottom:4px;"><strong>Vero Technologies Inc.</strong></div>
          <div>Vancouver, BC</div>
          <div>getvero.ca</div>
        </div>
        <div class="signature-block">
          CP Digital Signature<br>
          <span style="font-family:monospace; font-size:9px; color:#777;">${certRef}</span>
        </div>
      </div>

      <script>window.onload = () => window.print()</script>
    </body>
    </html>
  `)
  win.document.close()
}
