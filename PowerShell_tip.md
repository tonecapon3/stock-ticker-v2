# Working with TypeScript Type Declarations in PowerShell

When working with TypeScript code in PowerShell, special characters like angle brackets (<>) are interpreted as redirection operators, causing parser errors.

## Option 1: Use single quotes to preserve special characters

```powershell
$typeDeclaration = 'const TickerProvider: React.FC<{ children: ReactNode }> = ({ children }) => {'
Write-Output $typeDeclaration
```

## Option 2: Escape angle brackets with backticks

```powershell
$typeDeclaration = "const TickerProvider: React.FC`<{ children: ReactNode }`> = ({ children }) => {"
Write-Output $typeDeclaration
```

## Option 3: Use a text editor instead of the terminal

It's generally better to view and edit TypeScript files using a proper text editor like VS Code rather than trying to manipulate complex type declarations directly in the PowerShell terminal.

