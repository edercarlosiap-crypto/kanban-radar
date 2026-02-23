const path = require('path');

console.log('Script standalone:');
console.log('  __dirname:', __dirname);
console.log('  resolvedPath:', path.resolve(__dirname, '../database.db'));

console.log('\nDatabase config (simulando):');
const configPath = path.join(__dirname, '../../database.db');
console.log('  configPath (from src/config):', configPath);

const serverPath = path.join(__dirname, '../database.db');
console.log('  serverPath (from backend root):', serverPath);
