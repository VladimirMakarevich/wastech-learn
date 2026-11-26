#!/usr/bin/env node
// A committed launcher rather than a bin entry pointing into dist/: the TypeScript compiler does not keep
// the executable bit, and npm links workspace bins before dist/ exists.
import "../dist/bin.js";
