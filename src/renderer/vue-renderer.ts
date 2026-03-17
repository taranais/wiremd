import type {
  DocumentNode,
  FormNode,
  NodeOf,
  ParagraphNode,
  RenderHelpers,
  RenderOptions,
  RenderResult,
  WiremdNode,
} from '../types.js';
import { getStyleCSS } from './styles.js';
import {
  analyzeFrameworkState,
  buildAnnotationText,
  buildPrefixedClasses,
  buildResponsiveGridClasses,
  escapeHtml,
  getStates,
  getIconGlyph,
  isAnnotationOnlyNode,
  repeatString,
} from './plugin-utils.js';

interface VueOptions extends RenderOptions {
  componentName?: string;
  typescript?: boolean;
  scopedStyles?: boolean;
  compositionApi?: boolean;
}

interface VueContext {
  classPrefix: string;
  analysis: ReturnType<typeof analyzeFrameworkState>;
  helpers: RenderHelpers;
  showAnnotations: boolean;
}

export function renderVueComponent(
  ast: DocumentNode,
  options: VueOptions = {},
  helpers: RenderHelpers,
): RenderResult {
  const classPrefix = options.classPrefix || 'wmd-';
  const componentName = options.componentName || 'WiremdComponent';
  const typescript = options.typescript !== false;
  const scopedStyles = options.scopedStyles !== false;
  const compositionApi = options.compositionApi !== false;
  const analysis = analyzeFrameworkState(ast, helpers);
  const context: VueContext = {
    classPrefix,
    analysis,
    helpers,
    showAnnotations: Boolean(options.showAnnotations),
  };

  const templateContent = ast.children.map((child) => renderVueNode(child, context, 2)).join('\n');
  const styles = getStyleCSS(options.style || 'sketch', classPrefix);
  const script = compositionApi
    ? renderCompositionScript(componentName, analysis, typescript)
    : renderOptionsScript(componentName, analysis, typescript);
  const component = `<template>
  <div class="${classPrefix}root ${classPrefix}${options.style || 'sketch'}">
${templateContent}
  </div>
</template>

${script}

<style${scopedStyles ? ' scoped' : ''}>
${styles}
</style>`;

  return {
    format: 'vue',
    artifacts: [{ filename: `${componentName}.vue`, content: component }],
  };
}

function renderCompositionScript(
  componentName: string,
  analysis: ReturnType<typeof analyzeFrameworkState>,
  typescript: boolean,
): string {
  const lang = typescript ? ' lang="ts"' : '';
  const state = renderFrameworkStateObject(analysis.fields);
  const propsType = typescript ? `{
  initialState?: Partial<Record<string, unknown>>;
  title?: string;
}` : '';
  const emitType = typescript ? `{
  (event: 'submit', payload: Record<string, unknown>): void;
  (event: 'button-click', payload: string): void;
}` : '';

  return `<script setup${lang}>
import { reactive } from 'vue';

const componentName = '${componentName}';
const props = defineProps${typescript ? `<${propsType}>` : ''}();
const emit = defineEmits${typescript ? `<${emitType}>` : ''}();
const formState = reactive({
${state}
  ...(props.initialState || {}),
});

function handleSubmit() {
  emit('submit', { ...formState });
}

function handleButtonClick(label${typescript ? ': string' : ''}) {
  emit('button-click', label);
}
</script>`;
}

function renderOptionsScript(
  componentName: string,
  analysis: ReturnType<typeof analyzeFrameworkState>,
  typescript: boolean,
): string {
  const lang = typescript ? ' lang="ts"' : '';
  const state = renderFrameworkStateObject(analysis.fields);

  return `<script${lang}>
import { defineComponent } from 'vue';

export default defineComponent({
  name: '${componentName}',
  emits: ['submit', 'button-click'],
  data() {
    return {
      formState: {
${state}
      },
    };
  },
  methods: {
    handleSubmit() {
      this.$emit('submit', { ...this.formState });
    },
    handleButtonClick(label${typescript ? ': string' : ''}) {
      this.$emit('button-click', label);
    },
  },
});
</script>`;
}

function renderFrameworkStateObject(fields: ReturnType<typeof analyzeFrameworkState>['fields']): string {
  if (fields.length === 0) {
    return '  ';
  }

  return fields.map((field) => `  ${field.key}: ${renderStateValue(field.initialValue)},`).join('\n');
}

function renderVueNode(node: WiremdNode, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);

  if (isAnnotationOnlyNode(node) && !context.showAnnotations) {
    return '';
  }

  let rendered: string;

  switch (node.type) {
    case 'button':
      rendered = renderVueButton(node, context, indent);
      break;
    case 'input':
      rendered = renderVueInput(node, context, indent);
      break;
    case 'textarea':
      rendered = renderVueTextarea(node, context, indent);
      break;
    case 'select':
      rendered = renderVueSelect(node, context, indent);
      break;
    case 'checkbox':
      rendered = renderVueCheckbox(node, context, indent);
      break;
    case 'radio':
      rendered = renderVueRadio(node, context, indent);
      break;
    case 'radio-group':
      rendered = renderVueWrapper('div', 'radio-group', node.children, node.props, context, indent);
      break;
    case 'icon':
      rendered = `${spaces}<span class="${buildPrefixedClasses(context.classPrefix, 'icon', node.props)}" data-icon="${escapeHtml(node.props.name)}" aria-label="${escapeHtml(node.props.name)}">${getIconGlyph(node.props.name)}</span>`;
      break;
    case 'container':
      rendered = renderVueWrapper('div', `container-${node.containerType}`, node.children, node.props, context, indent);
      break;
    case 'nav':
      rendered = renderVueWrapper('nav', 'nav', node.children, node.props, context, indent);
      break;
    case 'nav-item':
      rendered = renderVueNavItem(node, context, indent);
      break;
    case 'brand':
      rendered = renderVueWrapper('div', 'brand', node.children, node.props, context, indent);
      break;
    case 'grid':
      rendered = renderVueGrid(node, context, indent);
      break;
    case 'grid-item':
      rendered = renderVueWrapper('div', 'grid-item', node.children, node.props, context, indent);
      break;
    case 'form':
      rendered = renderVueForm(node, context, indent);
      break;
    case 'heading':
      rendered = renderVueHeading(node, context, indent);
      break;
    case 'paragraph':
      rendered = renderVueParagraph(node, context, indent);
      break;
    case 'text':
      rendered = `${spaces}${escapeHtml(node.content)}`;
      break;
    case 'image':
      rendered = renderVueImage(node, context, indent);
      break;
    case 'link':
      rendered = renderVueLink(node, context, indent);
      break;
    case 'list':
      rendered = renderVueList(node, context, indent);
      break;
    case 'list-item':
      rendered = renderVueListItem(node, context, indent);
      break;
    case 'table':
      rendered = renderVueTable(node, context, indent);
      break;
    case 'table-header':
      rendered = renderVueTableHeader(node, context, indent);
      break;
    case 'table-row':
      rendered = renderVueTableRow(node, context, indent);
      break;
    case 'table-cell':
      rendered = renderVueTableCell(node, context, indent);
      break;
    case 'blockquote':
      rendered = renderVueWrapper('blockquote', 'blockquote', node.children, node.props, context, indent);
      break;
    case 'code':
      rendered = renderVueCode(node, context, indent);
      break;
    case 'separator':
      rendered = `${spaces}<hr class="${buildPrefixedClasses(context.classPrefix, 'separator', node.props)}" />`;
      break;
    case 'alert':
      rendered = renderVueWrapper('div', `state-${node.alertType}`, node.children, node.props, context, indent);
      break;
    case 'badge':
      rendered = `${spaces}<span class="${buildPrefixedClasses(context.classPrefix, 'badge', node.props)}">${escapeHtml(node.content)}</span>`;
      break;
    case 'loading-state':
      rendered = renderVueStateBlock(node.message || 'Loading...', node.children || [], node.props, context, indent, 'clock', 'loading-state');
      break;
    case 'empty-state':
      rendered = renderVueStateBlock(node.title || 'Empty state', node.children, node.props, context, indent, node.icon, 'empty-state');
      break;
    case 'error-state':
      rendered = renderVueStateBlock(node.title || 'Error state', node.children, node.props, context, indent, node.icon, 'error-state');
      break;
    default:
      rendered = `${spaces}<!-- Unsupported node type: ${(node as { type: string }).type} -->`;
      break;
  }

  return appendVueAnnotationMarkup(rendered, ('props' in node && node.props) ? node.props : {}, context, indent);
}

function renderVueButton(node: NodeOf<'button'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'button', node.props);
  const buttonType = node.props.type || (node.props.variant === 'primary' ? 'submit' : 'button');
  const disabled = (node.props.disabled || getStates(node.props).includes('disabled')) ? ' disabled' : '';
  const clickHandler = buttonType === 'submit' ? '' : ` @click="handleButtonClick('${escapeHtml(node.content || 'button')}')"`;
  const content = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');

  return `${spaces}<button class="${classes}" type="${buttonType}"${disabled}${clickHandler}>${content}</button>`;
}

function renderVueInput(node: NodeOf<'input'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'input', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'field', 'field');
  const required = node.props.required ? ' required' : '';
  const disabled = (node.props.disabled || getStates(node.props).includes('disabled')) ? ' disabled' : '';
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const type = node.props.inputType || node.props.type || 'text';

  return `${spaces}<input v-model="formState.${field}" type="${type}" class="${classes}"${placeholder}${required}${disabled} />`;
}

function renderVueTextarea(node: NodeOf<'textarea'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'textarea', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'field', 'field');
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const rows = node.props.rows || 4;

  return `${spaces}<textarea v-model="formState.${field}" class="${classes}" rows="${rows}"${placeholder}></textarea>`;
}

function renderVueSelect(node: NodeOf<'select'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'select', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'select', 'select');
  const placeholder = node.props.placeholder
    ? `\n${spaces}  <option value="" disabled>${escapeHtml(node.props.placeholder)}</option>`
    : '';
  const options = node.options
    .map((option) => `${spaces}  <option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join('\n');

  return `${spaces}<select v-model="formState.${field}" class="${classes}">${placeholder}${placeholder || options ? '\n' : ''}${options}\n${spaces}</select>`;
}

function renderVueCheckbox(node: NodeOf<'checkbox'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'checkbox', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.label || 'checkbox', 'checkbox');
  const label = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.label || '');

  return `${spaces}<label class="${classes}"><input v-model="formState.${field}" type="checkbox" /> <span>${label}</span></label>`;
}

function renderVueRadio(node: NodeOf<'radio'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'radio', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.label, 'radioGroup');
  const value = escapeHtml(typeof node.props.value === 'string' ? node.props.value : node.label);

  return `${spaces}<label class="${classes}"><input v-model="formState.${field}" type="radio" value="${value}" /> <span>${escapeHtml(node.label)}</span></label>`;
}

function renderVueForm(node: FormNode, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'form', node.props);
  const children = node.children.map((child) => renderVueNode(child, context, indent + 1)).join('\n');
  return `${spaces}<form class="${classes}" @submit.prevent="handleSubmit">\n${children}\n${spaces}</form>`;
}

function renderVueHeading(node: NodeOf<'heading'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, `h${node.level}`, node.props);
  const content = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<h${node.level} class="${classes}">${content}</h${node.level}>`;
}

function renderVueParagraph(node: ParagraphNode, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'paragraph', node.props);
  const content = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<p class="${classes}">${content}</p>`;
}

function renderVueImage(node: NodeOf<'image'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'image', node.props);
  const width = node.props.width ? ` width="${escapeHtml(String(node.props.width))}"` : '';
  const height = node.props.height ? ` height="${escapeHtml(String(node.props.height))}"` : '';
  return `${spaces}<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" class="${classes}"${width}${height} />`;
}

function renderVueLink(node: NodeOf<'link'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'link', node.props);
  const content = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<a href="${escapeHtml(node.href)}" class="${classes}">${content}</a>`;
}

function renderVueList(node: NodeOf<'list'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const tag = node.ordered ? 'ol' : 'ul';
  const classes = buildPrefixedClasses(context.classPrefix, 'list', node.props);
  const children = node.children.map((child) => renderVueNode(child, context, indent + 1)).join('\n');
  return `${spaces}<${tag} class="${classes}">\n${children}\n${spaces}</${tag}>`;
}

function renderVueListItem(node: NodeOf<'list-item'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'list-item', node.props);
  const content = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<li class="${classes}">${content}</li>`;
}

function renderVueTable(node: NodeOf<'table'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'table', node.props);
  const children = node.children.map((child) => renderVueNode(child, context, indent + 1)).join('\n');
  return `${spaces}<table class="${classes}">\n${children}\n${spaces}</table>`;
}

function renderVueTableHeader(node: NodeOf<'table-header'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const children = node.children.map((child) => renderVueNode(child, context, indent + 2)).join('\n');
  return `${spaces}<thead>\n${spaces}  <tr>\n${children}\n${spaces}  </tr>\n${spaces}</thead>`;
}

function renderVueTableRow(node: NodeOf<'table-row'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const children = node.children.map((child) => renderVueNode(child, context, indent + 1)).join('\n');
  return `${spaces}<tr>\n${children}\n${spaces}</tr>`;
}

function renderVueTableCell(node: NodeOf<'table-cell'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const tag = node.header ? 'th' : 'td';
  const classes = buildPrefixedClasses(context.classPrefix, `table-cell ${context.classPrefix}align-${node.align || 'left'}`, {});
  const content = node.children && node.children.length > 0
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<${tag} class="${classes}">${content}</${tag}>`;
}

function renderVueCode(node: NodeOf<'code'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  if (node.inline !== false) {
    return `${spaces}<code class="${buildPrefixedClasses(context.classPrefix, 'code-inline', {})}">${escapeHtml(node.value)}</code>`;
  }

  return `${spaces}<pre class="${buildPrefixedClasses(context.classPrefix, 'code-block', {})}"><code>${escapeHtml(node.value)}</code></pre>`;
}

function renderVueGrid(node: NodeOf<'grid'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const responsiveClass = buildResponsiveGridClasses(context.classPrefix, node.props?.responsive?.gridColumns);
  const classes = `${buildPrefixedClasses(context.classPrefix, 'grid', node.props)} ${context.classPrefix}grid-${node.columns}${responsiveClass ? ` ${responsiveClass}` : ''}`;
  const children = node.children.map((child) => renderVueNode(child, context, indent + 1)).join('\n');
  return `${spaces}<div class="${classes}" style="--grid-columns: ${node.columns}">\n${children}\n${spaces}</div>`;
}

function renderVueNavItem(node: NodeOf<'nav-item'>, context: VueContext, indent: number): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, 'nav-item', node.props);
  const content = node.children
    ? node.children.map((child) => renderVueNode(child, context, 0)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<a href="${escapeHtml(node.href || '#')}" class="${classes}">${content}</a>`;
}

function renderVueWrapper(
  tag: string,
  baseClass: string,
  children: WiremdNode[],
  props: Record<string, unknown>,
  context: VueContext,
  indent: number,
): string {
  const spaces = repeatString('  ', indent);
  const classes = buildPrefixedClasses(context.classPrefix, baseClass, props);
  const content = children.map((child) => renderVueNode(child, context, indent + 1)).filter(Boolean).join('\n');
  return `${spaces}<${tag} class="${classes}">\n${content}\n${spaces}</${tag}>`;
}

function renderVueStateBlock(
  title: string,
  children: WiremdNode[],
  props: Record<string, unknown>,
  context: VueContext,
  indent: number,
  icon?: string,
  stateKind = 'empty-state',
): string {
  const spaces = repeatString('  ', indent);
  const classes = `${buildPrefixedClasses(context.classPrefix, 'state-block', props)} ${context.classPrefix}container-${stateKind}`;
  const content = children.map((child) => renderVueNode(child, context, indent + 1)).filter(Boolean).join('\n');
  const iconMarkup = icon ? `<span data-icon="${escapeHtml(icon)}">${getIconGlyph(icon)}</span>` : '';
  return `${spaces}<div class="${classes}">\n${spaces}  <strong>${iconMarkup}${escapeHtml(title)}</strong>\n${content ? `${content}\n` : ''}${spaces}</div>`;
}

function appendVueAnnotationMarkup(
  rendered: string,
  props: Record<string, unknown>,
  context: VueContext,
  indent: number,
): string {
  if (!context.showAnnotations) {
    return rendered;
  }

  const annotationText = buildAnnotationText(props);
  if (!annotationText) {
    return rendered;
  }

  const spaces = repeatString('  ', indent);
  return `${rendered}\n${spaces}<aside class="${context.classPrefix}annotation-callout">${escapeHtml(annotationText)}</aside>`;
}

function renderStateValue(value: string | boolean | string[]): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => `'${escapeHtml(entry)}'`).join(', ')}]`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return `'${escapeHtml(value)}'`;
}
