import config from "./vite.config.js";
const c = config.default || config;
console.log("hasDefault", !!config.default);
const plugins = c.plugins || [];
console.log("pluginNames", plugins.map(p => p && p.name));
console.log("reactPlugins", plugins.filter(p => p && p.name && p.name.includes('react')).map(p => ({name:p.name, enforce:p.enforce, hasTransform: !!p.transform, hasConfig: typeof p.config})));
