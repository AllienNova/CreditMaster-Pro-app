/**
 * Custom ESLint rule (TASK-MNY-06).
 *
 * Flags property assignments or type annotations where a property whose name
 * matches /amount|price|payout|commission/i is given a plain `number` type or
 * a numeric literal, rather than the `Cents` branded type from `@/lib/money`.
 *
 * This is a SURFACE rule — it fires on property *definitions* in object
 * literals and interface/type members, not on every numeric expression.  Its
 * purpose is to catch new money fields being added without the branded type,
 * surfacing the remaining migration surface for a future task.
 *
 * Severity is `warn` (not `error`) because the repo already carries a large
 * legacy surface of untyped money fields; escalating to an error would break
 * the build on untouched code.  Once the full migration is done the severity
 * can be raised.
 *
 * Excludes:
 *   - Test files (`__tests__/`, `*.test.*`, `*.spec.*`)
 *   - The `src/lib/money/` module itself (where `Cents` is defined)
 */

const path = require('path');

const MONEY_FIELD_RE = /amount|price|payout|commission/i;

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'flag raw `number` on money-named fields — use Cents from @/lib/money instead (TASK-MNY-06)',
      recommended: false,
    },
    schema: [],
    messages: {
      useMoneyType:
        "Property '{{name}}' looks like a money field. Prefer the `Cents` branded type " +
        "from `@/lib/money` to prevent unit-confusion bugs (TASK-MNY-06).",
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const normalized = filename.split(path.sep).join('/');

    const isExcluded =
      normalized.includes('/__tests__/') ||
      normalized.includes('.test.') ||
      normalized.includes('.spec.') ||
      normalized.includes('/src/lib/money/');

    if (isExcluded) {
      return {};
    }

    /**
     * Return the simple string name of a property key node, or null if it
     * cannot be determined statically.
     */
    function keyName(node) {
      if (node.type === 'Identifier') return node.name;
      if (node.type === 'Literal' && typeof node.value === 'string') return node.value;
      return null;
    }

    /**
     * True when a TS type annotation resolves to the bare `number` keyword.
     */
    function isBareNumber(typeAnnotation) {
      if (!typeAnnotation) return false;
      const t = typeAnnotation.typeAnnotation || typeAnnotation;
      return t && t.type === 'TSNumberKeyword';
    }

    return {
      // Interface / type alias members: `amount: number`
      TSPropertySignature(node) {
        const name = keyName(node.key);
        if (!name || !MONEY_FIELD_RE.test(name)) return;
        if (isBareNumber(node.typeAnnotation)) {
          context.report({ node, messageId: 'useMoneyType', data: { name } });
        }
      },

      // Object literal property with a numeric value: `{ amount: 100 }`
      Property(node) {
        if (node.computed) return;
        const name = keyName(node.key);
        if (!name || !MONEY_FIELD_RE.test(name)) return;
        if (
          node.value &&
          node.value.type === 'Literal' &&
          typeof node.value.value === 'number'
        ) {
          context.report({ node, messageId: 'useMoneyType', data: { name } });
        }
      },
    };
  },
};
