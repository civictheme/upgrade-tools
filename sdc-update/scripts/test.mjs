import fs from "fs";
import path from "path";

export function updateBlockNames(twigFiles) {
    for (const filePath of twigFiles) {
        const fileData = fs.readFileSync(filePath, 'utf8');
        const matches = fileData.matchAll(/\{%\s{1,2}block [a-zA-Z0-9_-]+/g);
        const matchesArray = Array.from(matches).reverse();
        let updateData = fileData;

        matchesArray.forEach(match => {
            const idx = match.index;
            const str = match[0];
            updateData = updateData.substring(0, idx) + `${str}_block` + updateData.substring(idx + str.length);
        });

        fs.writeFileSync(filePath, updateData, 'utf8');
    }
}
const filePath = path.join(process.cwd(), 'scripts', 'page.twig')
updateBlockNames([filePath])
