## 🪟 Windows Path Guidelines

**CRITICAL: Proper path formatting is essential for Windows compatibility.**

### ✅ Correct Path Formats

**1. Standard Windows Paths:**
```
✅ CORRECT: C:\Users\Username\Documents\Project
✅ CORRECT: D:\Development\MyApp
✅ CORRECT: C:\Program Files\MyApp
```

**2. UNC Paths (Network Shares):**
```
✅ CORRECT: \\server\share\folder
✅ CORRECT: \\192.168.0.100\shared\documents
```

**3. Relative Paths:**
```
✅ CORRECT: .\subfolder\file.txt
✅ CORRECT: ..\parent\folder
```

### ❌ Problematic Path Formats

**1. WSL/Unix Style Paths:**
```
❌ PROBLEMATIC: /c/Users/Username/Documents
❌ PROBLEMATIC: /d/Development/MyApp
❌ PROBLEMATIC: /mnt/c/Projects
```

**2. Mixed Separators:**
```
❌ PROBLEMATIC: C:/Users\Username/Documents
❌ PROBLEMATIC: C:\Users/Username\Documents
```

**3. Invalid Characters:**
```
❌ PROBLEMATIC: C:\Users\Username<>\Documents
❌ PROBLEMATIC: C:\Users\Username:"*?\Documents
```

### 🔄 Path Conversion Examples

**WSL/Unix to Windows:**
```bash
# WSL/Unix Format (INPUT)
/c/Development/ProjectName
/d/workspace/my-project
/c/Users/Username/Documents

# Windows Format (CORRECTED)
C:\Development\ProjectName
D:\workspace\my-project
C:\Users\Username\Documents
```

**URL-Encoded Paths:**
```bash
# URL-Encoded (INPUT)
/c%3A/Development/ProjectName
C%3A%5CUsers%5CUsername

# Decoded Windows Format (CORRECTED)
C:\Development\ProjectName
C:\Users\Username
```

### 🛡️ Path Validation Rules

**1. Character Restrictions:**
- **Forbidden:** `< > : " | ? *`
- **Special Case:** `:` is only valid after drive letter (e.g., `C:`)

**2. Reserved Names (Avoid):**
- **System Reserved:** `CON`, `PRN`, `AUX`, `NUL`
- **Port Names:** `COM1-9`, `LPT1-9`

**3. Length Limitations:**
- **Maximum:** 260 characters (default Windows limit)
- **Recommendation:** Keep paths under 200 characters

**4. Trailing Issues:**
- **Avoid:** Trailing spaces or dots
- **Example:** `C:\Users\Username \` → `C:\Users\Username`

### 💡 Best Practices for projectPath

**When using Booster tools, always provide Windows-native paths:**

```typescript
// ✅ CORRECT Usage
Booster_Storage({
  "projectPath": "C:\\Development\\ProjectName",
  "WhyChange": "Reason for change",
  "WhatChange": "Description of change"
})

// ❌ INCORRECT Usage  
Booster_Storage({
  "projectPath": "/c/Development/ProjectName",  // WSL format
  "WhyChange": "Reason for change",
  "WhatChange": "Description of change"
})
```

### 🔧 Common Issues & Solutions

**Issue 1: Path Duplication**
```bash
# Problem: /c/Development/ProjectName becomes C:\c\Development\ProjectName
# Solution: Use C:\Development\ProjectName directly
```

**Issue 2: Permission Errors**
```bash
# Problem: Cannot write to system directories
# Solution: Use user directories or run with admin privileges
```

**Issue 3: Long Path Errors**
```bash
# Problem: Path exceeds 260 characters
# Solution: Enable long path support or use shorter paths
```

### 📋 Quick Reference

**For Terminal Commands:**
```bash
# Use absolute Windows paths
cd "C:\Development\ProjectName"
mkdir "C:\Users\Username\Documents\NewProject"
```

**For File Operations:**
```typescript
// Always escape backslashes in strings
const projectPath = "C:\\Development\\ProjectName";
const filePath = path.join(projectPath, "booster-data", "conclusion.md");
```

**For Booster Functions:**
```typescript
// Use consistent Windows format
projectPath: "C:\\Development\\ProjectName"  // ✅ Correct
projectPath: "/c/Development/ProjectName"    // ❌ Avoid
```

### 🚨 Error Prevention

**Always validate paths before use:**
1. Check for invalid characters
2. Verify path length
3. Ensure proper Windows format
4. Test write permissions

**The system automatically handles:**
- WSL/Unix path conversion
- URL decoding
- Path normalization
- Basic sanitization

**Manual intervention needed for:**
- Reserved name conflicts
- Permission issues
- Very long paths
- Network path problems