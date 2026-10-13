import { readdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import assert from "node:assert/strict";
import prettier from "prettier";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));

const write = process.argv.includes("--write");

const excluded = new Set([
  "node_modules",
  "generated",
  "dist",
  ".next",
  ".local",
  "public",
]);

async function sourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });

  const files = [];

  for (const entry of entries) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) {
      continue;
    }

    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await sourceFiles(file)));
    } else if (/\.(ts|tsx|mjs|css)$/.test(file) && !file.endsWith(".d.ts")) {
      files.push(file);
    }
  }

  return files.sort();
}

function parse(file, source) {
  return ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
}

function applyEdits(source, edits) {
  for (const edit of edits.sort((left, right) => {
    return right.start - left.start;
  })) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }

  return source;
}

function expandControlFlow(file, source) {
  const tree = parse(file, source);

  const edits = [];

  function wrap(statement) {
    if (ts.isBlock(statement)) {
      return;
    }

    edits.push({
      start: statement.getStart(tree),
      end: statement.getStart(tree),
      text: "{\n",
    });

    edits.push({ start: statement.end, end: statement.end, text: "\n}" });
  }

  function visit(node) {
    if (ts.isArrowFunction(node) && !ts.isBlock(node.body)) {
      edits.push({
        start: node.body.getStart(tree),
        end: node.body.getStart(tree),
        text: "{\nreturn ",
      });

      edits.push({ start: node.body.end, end: node.body.end, text: ";\n}" });
    } else if (ts.isIfStatement(node)) {
      wrap(node.thenStatement);

      if (node.elseStatement && !ts.isIfStatement(node.elseStatement)) {
        wrap(node.elseStatement);
      }
    } else if (
      ts.isForStatement(node) ||
      ts.isForOfStatement(node) ||
      ts.isForInStatement(node) ||
      ts.isWhileStatement(node) ||
      ts.isDoStatement(node)
    ) {
      wrap(node.statement);
    }

    ts.forEachChild(node, visit);
  }

  visit(tree);

  return applyEdits(source, edits);
}

function separateStatements(file, source) {
  const tree = parse(file, source);

  const edits = [];

  function visit(node) {
    if (
      ts.isSourceFile(node) ||
      ts.isBlock(node) ||
      ts.isCaseClause(node) ||
      ts.isDefaultClause(node)
    ) {
      for (let index = 0; index < node.statements.length - 1; index++) {
        const statement = node.statements[index];

        const next = node.statements[index + 1];

        if (ts.isImportDeclaration(statement)) {
          const gap = source.slice(statement.end, next.getStart(tree));

          if (ts.isImportDeclaration(next) && /^\s+$/.test(gap)) {
            edits.push({
              start: statement.end,
              end: next.getStart(tree),
              text: "\n",
            });
          }

          continue;
        }

        if (
          !source
            .slice(statement.getStart(tree), statement.end)
            .trimEnd()
            .endsWith(";")
        ) {
          continue;
        }

        const gap = source.slice(statement.end, next.getStart(tree));

        // Keep trailing comments beside the statement they describe.
        const lineEnd = source.indexOf("\n", statement.end);

        if (lineEnd >= 0 && !gap.includes("\n\n")) {
          edits.push({ start: lineEnd + 1, end: lineEnd + 1, text: "\n" });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(tree);

  return applyEdits(source, edits);
}

function runtimeShape(file, source) {
  const emitted = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      experimentalDecorators: true,
      removeComments: true,
    },
  }).outputText;

  const tree = parse("output.js", emitted);

  function shape(node) {
    if (ts.isParenthesizedExpression(node)) {
      return shape(node.expression);
    }

    if (
      ts.isBinaryExpression(node) &&
      [
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(node.operatorToken.kind)
    ) {
      const operator = node.operatorToken.kind;

      function operands(expression) {
        if (ts.isParenthesizedExpression(expression)) {
          return operands(expression.expression);
        }

        if (
          ts.isBinaryExpression(expression) &&
          expression.operatorToken.kind === operator
        ) {
          return [...operands(expression.left), ...operands(expression.right)];
        }

        return [shape(expression)];
      }

      return [node.kind, operator, operands(node)];
    }

    if (
      ts.isBlock(node) &&
      ts.isArrowFunction(node.parent) &&
      node.statements.length === 1 &&
      ts.isReturnStatement(node.statements[0]) &&
      node.statements[0].expression
    ) {
      return shape(node.statements[0].expression);
    }

    if (
      ts.isBlock(node) &&
      node.statements.length === 1 &&
      (ts.isIfStatement(node.parent) ||
        ts.isIterationStatement(node.parent, false))
    ) {
      return shape(node.statements[0]);
    }

    const children = [];

    ts.forEachChild(node, (child) => {
      children.push(shape(child));
    });

    // JSX formatting can split one rendered text child into adjacent strings.
    if (
      ts.isArrayLiteralExpression(node) &&
      ts.isPropertyAssignment(node.parent) &&
      node.parent.name.getText(tree) === "children"
    ) {
      for (let index = children.length - 1; index > 0; index--) {
        if (
          children[index][0] === ts.SyntaxKind.StringLiteral &&
          children[index - 1][0] === ts.SyntaxKind.StringLiteral
        ) {
          children[index - 1][1] += children[index][1];

          children.splice(index, 1);
        }
      }
    }

    const value =
      ts.isIdentifier(node) ||
      ts.isLiteralExpression(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
        ? node.text
        : null;

    return [node.kind, value, node.operator ?? null, children];
  }

  return shape(tree);
}

let changed = 0;

for (const file of [
  ...(await sourceFiles(path.join(root, "apps"))),
  ...(await sourceFiles(path.join(root, "packages"))),
  ...(await sourceFiles(path.join(root, "scripts"))),
]) {
  const original = await readFile(file, "utf8");

  const options = { ...(await prettier.resolveConfig(file)), filepath: file };

  const code = /\.(ts|tsx|mjs)$/.test(file);

  let formatted = await prettier.format(
    code ? expandControlFlow(file, original) : original,
    options,
  );

  if (code) {
    formatted = separateStatements(file, formatted);
  }

  if (formatted === original) {
    continue;
  }

  if (code) {
    assert.deepEqual(
      runtimeShape(file, formatted),
      runtimeShape(file, original),
      `Formatting changed runtime syntax: ${path.relative(root, file)}`,
    );
  }

  changed++;

  if (write) {
    await writeFile(file, formatted);
  } else {
    console.log(path.relative(root, file));
  }
}

console.log(`${changed} files ${write ? "formatted" : "need formatting"}.`);

if (!write && changed > 0) {
  process.exitCode = 1;
}
