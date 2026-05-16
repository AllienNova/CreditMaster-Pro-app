/**
 * Custom ESLint rule (TASK-PRE-05).
 *
 * Flags `Math.random()` calls in production source code. Cryptographically weak
 * randomness and non-deterministic mock data are a recurring Wave 7 audit
 * finding (e.g. FND-052: admin analytics returning `Math.random()`).
 *
 * Excludes test code (`__tests__/` directories) and the sanctioned random
 * helpers under `src/lib/random/`.
 *
 * Severity is `warn` for now; it escalates to `error` in Wave 7 Phase 4.
 */

const path = require('path');

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow Math.random() in production code (TASK-PRE-05)',
      recommended: false,
    },
    schema: [],
    messages: {
      banned:
        'Math.random() is banned in production code (TASK-PRE-05).',
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const normalized = filename.split(path.sep).join('/');

    const isExcluded =
      normalized.includes('/__tests__/') ||
      normalized.includes('/src/lib/random/');

    if (isExcluded) {
      return {};
    }

    return {
      CallExpression(node) {
        const { callee } = node;
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'Math' &&
          callee.property.type === 'Identifier' &&
          callee.property.name === 'random'
        ) {
          context.report({ node, messageId: 'banned' });
        }
      },
    };
  },
};
