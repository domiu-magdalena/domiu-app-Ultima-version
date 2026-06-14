import pkg from './package.json' with { type: 'json' };
console.log('next:', pkg.dependencies?.next || 'NOT FOUND');
console.log('build:', pkg.scripts?.build);
console.log('has pg:', pkg.dependencies?.pg || 'NOT FOUND');
