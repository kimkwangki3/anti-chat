const fs = require('fs');
const path = require('path');

const replacements = [
    [/peach-chat/g, 'peach-chat'],
    [/PeachChat/g, 'PeachChat'],
    [/Peach Chat/g, 'Peach Chat'],
    [/peach chat/g, 'peach chat'],
    [/PEACH/g, 'PEACH'],
    [/"peach"/g, '"peach"'],
    // Color replacements
    [/#FF8C69/g, '#FF8C69'],
    [/#FFB5A0/g, '#FFB5A0'],
    [/#E8735A/g, '#E8735A'],
    [/#E8735A/g, '#E8735A']
];

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
            if (!fullPath.includes('node_modules') && !fullPath.includes('.git') && !fullPath.includes('.next')) {
                walk(fullPath);
            }
        } else {
            if (/\.(ts|tsx|js|jsx|json|md|css)$/.test(file)) {
                try {
                    let content = fs.readFileSync(fullPath, 'utf8');
                    let newContent = content;
                    replacements.forEach(([regex, replacement]) => {
                        newContent = newContent.replace(regex, replacement);
                    });

                    // Fix accidental system keyword replacements
                    newContent = newContent.replace(/antialiased/g, 'antialiased');
                    newContent = newContent.replace(/peach-notifications/g, 'peach-notifications');

                    if (content !== newContent) {
                        fs.writeFileSync(fullPath, newContent, 'utf8');
                        console.log(`Updated: ${fullPath}`);
                    }
                } catch (e) {
                    console.error(`Error processing ${fullPath}: ${e.message}`);
                }
            }
        }
    });
}

walk('.');
console.log('Rebranding and Color replacement finished safely.');
