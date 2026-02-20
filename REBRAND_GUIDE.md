# ?‘ PEACH ??peach ë¦¬ë¸Œ?œë”© ê°€?´ë“œ

## ?“ ?„ì´ì½??Œì¼ ëª©ë¡
- `favicon.ico` ??public/favicon.ico
- `icon-192.png` ??public/icon-192.png (PWA)
- `icon-512.png` ??public/icon-512.png (PWA)
- `apple-touch-icon.png` ??public/apple-touch-icon.png

---

## ?“ Step 1. ?ìŠ¤???¼ê´„ ë³€ê²?
?°ë??ì—???„ë¡œ?íŠ¸ ë£¨íŠ¸ ?´ë”ë¡??´ë™ ??

### macOS
```bash
# ëª¨ë“  ?ŒìŠ¤?Œì¼?ì„œ ?ìŠ¤??ì¹˜í™˜
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" -o -name "*.json" -o -name "*.md" -o -name "*.css" \) \
  -not -path "*/node_modules/*" -not -path "*/.next/*" \
  -exec sed -i '' 's/peach-chat/peach-chat/g; s/PeachChat/PeachChat/g; s/Peach Chat/Peach Chat/g; s/Peach Chat/peach chat/g; s/"peach"/"peach"/g' {} +
```

### Windows (PowerShell)
```powershell
Get-ChildItem -Recurse -Include *.ts,*.tsx,*.js,*.jsx,*.json,*.md,*.css |
  Where-Object { $_.FullName -notmatch 'node_modules|\.next' } |
  ForEach-Object {
    (Get-Content $_.FullName) -replace 'peach-chat','peach-chat' -replace 'PeachChat','PeachChat' -replace 'Peach Chat','Peach Chat' | Set-Content $_.FullName
  }
```

---

## ?¨ Step 2. ?‰ìƒ ?Œë§ˆ ë³€ê²?
`tailwind.config.js` ?ëŠ” `globals.css` ?ì„œ:

```css
:root {
  --primary: #FF8C69;         /* ë³µìˆ­??ë©”ì¸ */
  --primary-light: #FFB5A0;   /* ?°í•œ ë³µìˆ­??*/
  --primary-dark: #E8735A;    /* ì§„í•œ ë³µìˆ­??*/
  --primary-foreground: #fff;
  --background: #FFF8F5;      /* ë°°ê²½ */
  --accent: #FFF0EB;          /* ê°•ì¡° ë°°ê²½ */
}
```

`tailwind.config.js` extend colors:
```js
colors: {
  peach: {
    50:  '#FFF8F5',
    100: '#FFE8DC',
    200: '#FFD0BC',
    300: '#FFB5A0',
    400: '#FF9A80',
    500: '#FF8C69',  // ??ë©”ì¸
    600: '#E8735A',
    700: '#C05A42',
    800: '#8B3D2A',
    900: '#5A2015',
  }
}
```

---

## ?–¼ï¸?Step 3. ?„ì´ì½??Œì¼ êµì²´

```bash
cp favicon.ico [?„ë¡œ?íŠ¸]/public/favicon.ico
cp icon-192.png [?„ë¡œ?íŠ¸]/public/icon-192.png
cp icon-512.png [?„ë¡œ?íŠ¸]/public/icon-512.png
cp apple-touch-icon.png [?„ë¡œ?íŠ¸]/public/apple-touch-icon.png
```

### manifest.json ?˜ì •
```json
{
  "name": "Peach Chat",
  "short_name": "Peach",
  "description": "Peach Chat - ë³µìˆ­?„ì²˜???¬ì½¤??ì±„íŒ…",
  "theme_color": "#FF8C69",
  "background_color": "#FFF8F5"
}
```

---

## ?? Step 4. ë°°í¬

```bash
git add .
git commit -m "rebrand: PEACH ??peach ?‘"
git push origin main
```

??Vercel ?ë™ ë°°í¬ ?„ë£Œ! ?‰
