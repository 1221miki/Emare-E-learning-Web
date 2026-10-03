import react from './node_modules/@vitejs/plugin-react/dist/index.js';
const plugins = react({ include:['**/*.{js,jsx,ts,tsx}'] });
console.log('pluginsLength=', plugins.length);
for (let i = 0; i < plugins.length; i++) {
  const p = plugins[i];
  console.log(`plugin[${i}] name=${p.name} enforce=${p.enforce} hasTransform=${typeof p.transform === 'object'} hasConfig=${typeof p.config}`);
  if (p.transform) {
    console.log('  transform filter', p.transform.filter);
  }
}
