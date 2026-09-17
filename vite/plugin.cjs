Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_vite_virtual_plugin = require("./virtual/plugin.cjs");
const require_vite_server_plugin = require("./server/plugin.cjs");
const require_vite_iife_plugin = require("./iife/plugin.cjs");
exports.iife = require_vite_iife_plugin.iife;
exports.serve = require_vite_server_plugin.serve;
exports.virtual = require_vite_virtual_plugin.virtual;
