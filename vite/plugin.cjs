Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const require_vite_virtual_plugin = require("./virtual/plugin.cjs");
const require_vite_server_plugin = require("./server/plugin.cjs");
const require_vite_iife_plugin = require("./iife/plugin.cjs");
const require_vite_lifecycle_plugin = require("./lifecycle/plugin.cjs");
exports.iife = require_vite_iife_plugin.iife;
exports.lifecycle = require_vite_lifecycle_plugin.lifecycle;
exports.serve = require_vite_server_plugin.serve;
exports.virtual = require_vite_virtual_plugin.virtual;
