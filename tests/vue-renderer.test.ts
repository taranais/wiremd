import { describe, expect, it } from 'vitest';
import { render, renderToVue } from '../src/index.js';
import { parse } from '../src/parser/index.js';
import { createFrameworkRendererMarkdown, createFrameworkSeededAst } from './fixtures/render-fixtures.js';

describe('Vue Renderer', () => {
  it('renders a typed Composition API single-file component by default', () => {
    const output = renderToVue(parse(createFrameworkRendererMarkdown()), {
      componentName: 'ProfileForm',
    });

    expect(output).toContain('<template>');
    expect(output).toContain('<script setup lang="ts">');
    expect(output).toContain("const componentName = 'ProfileForm'");
    expect(output).toContain('const props = defineProps<{');
    expect(output).toContain('const emit = defineEmits<{');
    expect(output).toContain('const formState = reactive({');
    expect(output).toContain("email: ''");
    expect(output).toContain('acceptTerms: true');
    expect(output).toContain('<div class="wmd-root wmd-sketch">');
    expect(output).toContain('v-model="formState.email"');
    expect(output).toContain('v-model="formState.message"');
    expect(output).toContain('v-model="formState.selectTopic"');
    expect(output).toContain('v-model="formState.acceptTerms"');
    expect(output).toMatch(/v-model=\"formState\.radiogroup\d+\"/);
    expect(output).toContain(`@click="handleButtonClick('Cancel')"`);
    expect(output).toContain('<nav class="wmd-nav">');
    expect(output).toContain('style="--grid-columns: 2"');
    expect(output).toContain('<table class="wmd-table">');
    expect(output).toContain('<style scoped>');
  });

  it('supports non-canonical seeded form defaults from direct AST input', () => {
    const output = renderToVue(createFrameworkSeededAst(), {
      componentName: 'SeededVue',
    });

    expect(output).toContain("message: 'Hello from wiremd'");
    expect(output).toContain("topic: 'support'");
    expect(output).toContain("contactMethod: 'email'");
    expect(output).toContain('v-model="formState.contactMethod"');
  });

  it('supports Options API, plain JavaScript, and unscoped styles through the universal renderer', () => {
    const output = render(parse(createFrameworkRendererMarkdown()), {
      format: 'vue',
      rendererOptions: {
        componentName: 'SettingsPanel',
        compositionApi: false,
        typescript: false,
        scopedStyles: false,
      },
    });

    expect(output).toContain('<script>');
    expect(output).not.toContain('<script setup');
    expect(output).not.toContain('lang="ts"');
    expect(output).toContain('export default defineComponent({');
    expect(output).toContain("name: 'SettingsPanel'");
    expect(output).toContain("this.$emit('submit'");
    expect(output).toContain("this.$emit('button-click', label)");
    expect(output).toContain('<style>');
    expect(output).not.toContain('<style scoped>');
  });

  it('derives Vue bindings from parsed markdown instead of only fixture ASTs', () => {
    const ast = parse(`
## Profile settings

[Email___]{type:email required}
- [x] Accept terms

[Submit]*
    `.trim());

    const output = renderToVue(ast, {
      componentName: 'ParsedVue',
    });

    expect(output).toContain("email: ''");
    expect(output).toContain('acceptTerms: true');
    expect(output).toContain('v-model="formState.email"');
    expect(output).toContain('type="email"');
    expect(output).toContain('v-model="formState.acceptTerms"');
    expect(output).toContain('type="submit"');
  });

  it('renders complex parsed markdown into Vue bindings across nav, form, table, and grid surfaces', () => {
    const ast = parse(createFrameworkRendererMarkdown());

    const output = renderToVue(ast, {
      componentName: 'ParsedComplexVue',
    });

    expect(output).toContain('<nav class="wmd-nav">');
    expect(output).toContain('acceptTerms: true');
    expect(output).toMatch(/radiogroup\d+: 'Email'/);
    expect(output).toContain('type="email"');
    expect(output).toContain('<textarea');
    expect(output).toContain('<select');
    expect(output).toContain('v-model="formState.acceptTerms"');
    expect(output).toMatch(/v-model=\"formState\.radiogroup\d+\"/);
    expect(output).toContain('<option value="Sales">Sales</option>');
    expect(output).toContain('<option value="Support">Support</option>');
    expect(output).toContain('style="--grid-columns: 2"');
    expect(output).toContain('<table class="wmd-table">');
    expect(output).toContain('type="submit"');
    expect(output).toContain(`@click="handleButtonClick('Cancel')"`);
  });

  it('renders Vue-specific state blocks for empty and error states', () => {
    const output = renderToVue(parse(`
::: empty-state
No records
Try another filter
:::

::: error-state
Load failed
Refresh the page and retry
:::
    `.trim()));

    expect(output).toContain('wmd-state-block');
    expect(output).toContain('wmd-container-empty-state');
    expect(output).toContain('No records');
    expect(output).toContain('Try another filter');
    expect(output).toContain('wmd-container-error-state');
    expect(output).toContain('Load failed');
    expect(output).toContain('Refresh the page and retry');
  });

  it('supports placeholders, responsive grid classes, viewport blocks, and annotation visibility', () => {
    const ast = parse(`
## Welcome {{user.name}}

## Features {.grid-3 .md:grid-2}
### A
### B
### C

::: mobile
[Submit] <!-- VUE-ANNOTATION-XYZ -->
:::

::: note
VUE-NOTE-XYZ
:::
    `.trim());

    const hidden = renderToVue(ast, { componentName: 'AuditVue', placeholderSeed: 'vue-seed' });
    const visible = renderToVue(ast, {
      componentName: 'AuditVue',
      placeholderSeed: 'vue-seed',
      showAnnotations: true,
    });
    const preserved = renderToVue(ast, {
      componentName: 'AuditVue',
      resolvePlaceholders: false,
    });

    expect(hidden).toContain('wmd-grid-md-2');
    expect(hidden).toContain('wmd-viewport-mobile');
    expect(hidden).not.toContain('{{user.name}}');
    expect(hidden).not.toContain('VUE-ANNOTATION-XYZ');
    expect(hidden).not.toContain('VUE-NOTE-XYZ');

    expect(visible).toContain('VUE-ANNOTATION-XYZ');
    expect(visible).toContain('wmd-annotation-callout');
    expect(visible).toContain('VUE-NOTE-XYZ');

    expect(preserved).toContain('{{user.name}}');
  });
});
