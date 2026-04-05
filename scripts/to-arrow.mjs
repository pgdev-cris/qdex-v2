/**
 * to-arrow.mjs
 *
 * Migrates all function declarations to const arrow functions across
 * frontend/src and backend/src using ts-morph (TypeScript-aware AST transforms).
 *
 * Usage:
 *   node scripts/to-arrow.mjs
 */

import { Project, SyntaxKind } from 'ts-morph'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const TARGETS = [
    {
        tsConfig: path.join(root, 'frontend/tsconfig.app.json'),
        srcDir: path.join(root, 'frontend/src'),
    },
    {
        tsConfig: path.join(root, 'backend/tsconfig.json'),
        srcDir: path.join(root, 'backend/src'),
    },
]

let totalConverted = 0
let totalFiles = 0

for (const { tsConfig, srcDir } of TARGETS) {
    console.log(`\n📂  ${path.relative(root, srcDir)}`)

    const project = new Project({
        tsConfigFilePath: tsConfig,
        skipAddingFilesFromTsConfig: false,
    })

    for (const sourceFile of project.getSourceFiles()) {
        const filePath = sourceFile.getFilePath()

        // Only process files inside srcDir, skip node_modules
        if (!filePath.startsWith(srcDir)) continue
        if (filePath.includes('node_modules')) continue

        // Collect FunctionDeclarations in reverse order (bottom → top) so that
        // replacing one node doesn't invalidate positions of earlier nodes.
        const funcs = sourceFile.getDescendantsOfKind(SyntaxKind.FunctionDeclaration).reverse()

        if (funcs.length === 0) continue

        let fileConverted = 0

        for (const func of funcs) {
            const name = func.getName()
            if (!name) continue // skip anonymous function declarations
            if (func.isGenerator()) continue // generators can't be arrow fns

            const isAsync = func.isAsync()
            const isExported = func.hasExportKeyword()
            const isDefaultExport = func.hasDefaultKeyword()

            // Type parameters  e.g. <T extends object>
            const typeParams = func.getTypeParameters()
            const typeParamsText = typeParams.length
                ? `<${typeParams.map((tp) => tp.getText()).join(', ')}>`
                : ''

            // Parameters
            const paramsText = func
                .getParameters()
                .map((p) => p.getText())
                .join(', ')

            // Return type annotation
            const returnTypeNode = func.getReturnTypeNode()
            const returnTypeText = returnTypeNode ? `: ${returnTypeNode.getText()}` : ''

            // Body
            const body = func.getBody()
            if (!body) continue // overload signatures — skip

            const bodyText = body.getFullText().trimStart()

            // Preserve leading JSDoc / block comments that are part of the node's
            // leading trivia. ts-morph includes them in getFullText() when you
            // ask for the whole statement, but replaceWithText operates on the
            // *node* text (without leading trivia). We read them explicitly.
            const leadingComments = func
                .getLeadingCommentRanges()
                .map((r) => r.getText())
                .join('\n')
            const commentPrefix = leadingComments ? leadingComments + '\n' : ''

            const asyncKw = isAsync ? 'async ' : ''

            let replacement

            if (isDefaultExport) {
                // `export default function foo()` is not valid with const, so we
                // split it into a declaration + a separate default export.
                replacement =
                    `${commentPrefix}const ${name} = ${asyncKw}${typeParamsText}(${paramsText})${returnTypeText} => ${bodyText}\n` +
                    `export default ${name}`
            } else {
                const exportKw = isExported ? 'export ' : ''
                replacement = `${commentPrefix}${exportKw}const ${name} = ${asyncKw}${typeParamsText}(${paramsText})${returnTypeText} => ${bodyText}`
            }

            func.replaceWithText(replacement)
            fileConverted++
        }

        if (fileConverted > 0) {
            sourceFile.saveSync()
            console.log(
                `  ✓  ${path.relative(srcDir, filePath)}  (${fileConverted} function${fileConverted > 1 ? 's' : ''})`
            )
            totalConverted += fileConverted
            totalFiles++
        }
    }
}

console.log(
    `\n✅  Done — converted ${totalConverted} function declaration${totalConverted !== 1 ? 's' : ''} in ${totalFiles} file${totalFiles !== 1 ? 's' : ''}.\n`
)
