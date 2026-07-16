const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace standalone ROAD occurrences
  content = content.replace(/\bROAD\b/g, 'ROAD FACING');
  
  // Specifically fix the logo component which is split as R and OAD
  if (file.includes('logo.tsx')) {
    content = content.replace(
      /<span className="text-amber-primary">R<\/span>\s*<span className="text-text-primary">OAD<\/span>/g,
      '<span className="text-amber-primary">R</span>\n            <span className="text-text-primary">OAD FACING</span>'
    );
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
