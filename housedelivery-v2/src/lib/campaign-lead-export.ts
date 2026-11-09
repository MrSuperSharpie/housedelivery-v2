// Server-side attachments for the existing notification transport.
function csvCell(value: string) {
  // Neutralize spreadsheet formulas; JSON retains original field values for CRM import.
  const safe = /^[\s]*[=+\-@]/.test(value) || /^[\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
export function leadAttachments(record: Record<string, string>) {
  const stem = `house-delivery-lead-${record.lead_reference}`;
  return [
    { filename: `${stem}.csv`, content: Buffer.from(`${Object.keys(record).map(csvCell).join(",")}\r\n${Object.values(record).map(csvCell).join(",")}\r\n`).toString("base64"), content_type: "text/csv" },
    { filename: `${stem}.json`, content: Buffer.from(JSON.stringify(record, null, 2)).toString("base64"), content_type: "application/json" },
  ];
}
