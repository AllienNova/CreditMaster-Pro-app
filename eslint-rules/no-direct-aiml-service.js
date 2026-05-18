/**
 * Custom ESLint rule (TASK-CMP-05 / FND-061).
 *
 * Flags any import of `aiml-service` or `AIMLService` from non-exempt files.
 * All AI calls must go through the ModelRouter abstraction layer so that model
 * selection, cost tracking, and task-type routing are enforced centrally.
 *
 * Exempt files (allowed to import aiml-service directly):
 *   - src/lib/model-router.ts          (the abstraction layer itself)
 *   - src/lib/ai-orchestrator.ts       (multi-model workflow engine)
 *   - src/lib/investments/signal-generator.ts  (multi-model signal engine)
 *   - src/lib/trading/engines/llm-trading-engine.ts  (multi-model trading engine)
 *   - src/lib/aiml-service.ts          (the module itself)
 *   - Test files (__tests__/, *.test.*, *.spec.*)
 */

const path = require('path');

const EXEMPT_SUFFIXES = [
  '/src/lib/model-router.ts',
  '/src/lib/ai-orchestrator.ts',
  '/src/lib/investments/signal-generator.ts',
  '/src/lib/trading/engines/llm-trading-engine.ts',
  '/src/lib/aiml-service.ts',
];

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow direct imports of aiml-service outside exempt files — use getModelRouter() instead (TASK-CMP-05 / FND-061)',
      recommended: false,
    },
    schema: [],
    messages: {
      noDirectAimlService:
        "Direct import of '{{source}}' is not allowed. " +
        'Use `getModelRouter().complete(TaskType.X, ...)` from `@/lib/model-router` instead (FND-061).',
    },
  },

  create(context) {
    const filename = context.filename || context.getFilename();
    const normalized = filename.split(path.sep).join('/');

    const isExempt =
      normalized.includes('/__tests__/') ||
      normalized.includes('.test.') ||
      normalized.includes('.spec.') ||
      EXEMPT_SUFFIXES.some((suffix) => normalized.endsWith(suffix));

    if (isExempt) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        // type-only imports are erased at compile time — no runtime coupling
        if (node.importKind === 'type') return;
        const source = node.source.value;
        if (
          typeof source === 'string' &&
          (source.includes('aiml-service') || source.includes('AIMLService'))
        ) {
          context.report({
            node,
            messageId: 'noDirectAimlService',
            data: { source },
          });
        }
      },
    };
  },
};
