const fs = require('fs');
const babel = require('@babel/parser');
const code = fs.readFileSync('App.js', 'utf8');
try {
  babel.parse(code, { sourceType: 'module', plugins: ['jsx'] });
  console.log('SINTAKSIS TOGRI');
} catch (e) {
  console.log('XATO:', e.message);
}