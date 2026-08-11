const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/lib/mock-data.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Replace isFeatured: true with isFeatured: true, displayCategory: "featured"
content = content.replace(/isFeatured:\s*true,/g, 'isFeatured: true,\n    displayCategory: "featured",');

// Replace isFeatured: false with isFeatured: false, displayCategory: "none"
content = content.replace(/isFeatured:\s*false,/g, 'isFeatured: false,\n    displayCategory: "none",');

// For projects, they might also have isFeatured
// Let's manually set a couple of "none" to "recommended" and "budget_friendly"
let count = 0;
content = content.replace(/displayCategory:\s*"none"/g, (match) => {
  count++;
  if (count === 1 || count === 3) return 'displayCategory: "recommended"';
  if (count === 2 || count === 4) return 'displayCategory: "budget_friendly"';
  return match;
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated mock-data.ts');
