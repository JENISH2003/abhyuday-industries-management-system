import * as XLSX from 'xlsx';

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
}

export const exportToExcel = (
  filename: string,
  sheetName: string,
  reportTitle: string,
  columns: ExcelColumn[],
  data: any[]
) => {
  // 1. Prepare Metadata Header Rows for a Professional Look
  const todayStr = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const metadataHeader = [
    [`Abhyuday Management System`],
    [`Report Title: ${reportTitle}`],
    [`Generated On: ${todayStr}`],
    [`Total Records: ${data.length}`],
    [], // Empty separator row
  ];

  // 2. Extract Data Rows according to Columns configuration
  const tableHeaders = columns.map((col) => col.header);
  const tableRows = data.map((item) =>
    columns.map((col) => {
      const val = item[col.key];
      if (val === null || val === undefined) return '';
      if (val instanceof Date) return val.toISOString().split('T')[0];
      return String(val);
    })
  );

  // Combine Metadata, Headers, and Data
  const sheetData = [...metadataHeader, tableHeaders, ...tableRows];

  // 3. Create Worksheet
  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // 4. Auto-calculate Column Widths for a clean professional look
  const colWidths = columns.map((col, index) => {
    let maxLen = col.header.length;
    tableRows.forEach((row) => {
      const cellVal = String(row[index] || '');
      if (cellVal.length > maxLen) {
        maxLen = cellVal.length;
      }
    });
    return { wch: Math.max(maxLen + 4, col.width || 14) };
  });

  worksheet['!cols'] = colWidths;

  // 5. Create Workbook and Append Sheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName || 'Report');

  // 6. Save & Download File
  const fullFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  XLSX.writeFile(workbook, fullFilename);
};
