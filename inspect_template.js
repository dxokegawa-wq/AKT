const ExcelJS = require('exceljs');

async function inspect() {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile('template.xlsx');
  const ws = workbook.worksheets[0];

  console.log("Sheet Name:", ws.name);
  
  // Print first 15 rows, columns 1 to 15
  for (let r = 1; r <= 15; r++) {
    const row = ws.getRow(r);
    let rowValues = [];
    for (let c = 1; c <= 15; c++) {
      const cell = row.getCell(c);
      let val = cell.value;
      if (val && val.richText) val = val.richText.map(rt => rt.text).join('');
      
      let info = `${val || ''}`;
      if (cell.isMerged) {
         if (cell.master.address === cell.address) {
            info += ` (MASTER)`;
         } else {
            info += ` (SLAVE of ${cell.master.address})`;
         }
      }
      rowValues.push(`[C${c}] ` + info.replace(/\n/g, ' '));
    }
    console.log(`Row ${r}:`, rowValues.join(' | '));
  }
}

inspect().catch(console.error);
