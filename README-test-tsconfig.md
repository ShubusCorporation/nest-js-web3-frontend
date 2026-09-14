# TypeScript Path Resolution Issue in Tests

## Problem
TypeScript fails to resolve path aliases (e.g., `@src/*`) inside the `test` directory, causing errors like `Cannot find module '@src/...'`.

## How This Garbage Works under the Hood
You might think adding `test` to `include` is backward because you are looking for `src` from tests, not vice versa. However, TypeScript works differently:

1. **Compilation Scope:** TypeScript only applies settings (like `compilerOptions.paths`) to files that are explicitly part of its project scope.
2. **The "Orphan" File Dilemma:** If `tsconfig.app.json` only contains `"include": ["src"]`, TypeScript assumes the `test` folder does not exist. 
3. **The Result:** When you open a test file, TypeScript treats it as an isolated "orphan" script. It completely ignores your `@src` aliases and tries to look for it inside `node_modules`, resulting in a crash.

> **TL;DR:** By adding `"test/"` to `include`, you aren't exporting test paths. You are telling TypeScript: *"Hey, look at the files in the test folder. They belong to this project too. Apply the `@src` alias settings to them."*

## Solution

Choose **one** of the following options to fix it.

### Option 1: Update existing `tsconfig.app.json` (Quickest)
Add the `test` directory to the `include` array so TypeScript applies the alias configurations to your test files. Using a trailing slash `test/` explicitly tells TS to scan the folder recursively.

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    // ... your configurations
  },
  "include": ["src", "test/"]
}
```

### Option 2: Create a dedicated `tsconfig.test.json` (Best Practice)
Keeps browser types and Node.js test environments isolated.

1. Create **`tsconfig.test.json`** in the root:
```json
{
  "extends": "./tsconfig.app.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "include": ["src", "test/"]
}
```

2. Register it in the root **`tsconfig.json`**:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.test.json" }
  ]
}
```

## Runtime Resolution (Vite / Vitest)
TypeScript only handles type-checking in the IDE. For Vitest to actually resolve these paths during test execution, ensure you have the `vite-tsconfig-paths` plugin configured in your bundler.

```typescript
// vite.config.ts or vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    // vitest configs
  },
});
```
