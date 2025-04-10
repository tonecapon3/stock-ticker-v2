# Working with TypeScript in PowerShell

## Issue Summary
The error you're encountering is not an issue with your TypeScript code but with PowerShell's command parsing. PowerShell interprets angle brackets (`<` and `>`) as redirection operators for input/output.

## Existing Code Status
Your `context.tsx` file already has the correct TypeScript syntax:
```typescript
export const TickerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
```

## Best Practices for TypeScript in PowerShell

### 1. Avoid Typing TypeScript Directly in PowerShell
Don't paste or type TypeScript type declarations directly into the PowerShell console.

### 2. Use a Code Editor
Use VS Code, WebStorm, or another editor to work with TypeScript files.

### 3. Run TypeScript Commands Using npm/yarn
Execute TypeScript operations through npm/yarn scripts:
```powershell
npm run build
npm run typecheck
```

### 4. View TypeScript Files Safely
```powershell
# View file content
Get-Content .\lib\context.tsx

# Edit with an editor
code .\lib\context.tsx
```

### 5. When Needed, Escape Angle Brackets
If you must work with TypeScript syntax in PowerShell commands:
```powershell
$code = 'const MyComponent: React.FC<{ prop: string }> = () => {}'
```

Remember: PowerShell is great for file operations and running build scripts, but not for directly writing TypeScript syntax.

