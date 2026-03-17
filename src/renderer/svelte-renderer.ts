import type { DocumentNode, NodeOf, RenderHelpers, RenderOptions, RenderResult, WiremdNode } from '../types.js';
import { getStyleCSS } from './styles.js';
import {
  analyzeFrameworkState,
  buildAnnotationText,
  buildPrefixedClasses,
  buildResponsiveGridClasses,
  escapeHtml,
  escapeJsString,
  getStates,
  getIconGlyph,
  isAnnotationOnlyNode,
  repeatString,
} from './plugin-utils.js';

interface SvelteOptions extends RenderOptions {
  componentName?: string;
  typescript?: boolean;
}

interface SvelteContext {
  classPrefix: string;
  analysis: ReturnType<typeof analyzeFrameworkState>;
  helpers: RenderHelpers;
  showAnnotations: boolean;
}

export function renderSvelteComponent(
  ast: DocumentNode,
  options: SvelteOptions = {},
  helpers: RenderHelpers,
): RenderResult {
  const classPrefix = options.classPrefix || 'wmd-';
  const componentName = options.componentName || 'WiremdComponent';
  const typescript = options.typescript !== false;
  const analysis = analyzeFrameworkState(ast, helpers);
  const context: SvelteContext = {
    classPrefix,
    analysis,
    helpers,
    showAnnotations: Boolean(options.showAnnotations),
  };
  const markup = ast.children.map((child) => renderSvelteNode(child, context, 0)).join('\n');
  const script = renderSvelteScript(analysis, typescript);
  const styles = getStyleCSS(options.style || 'sketch', classPrefix);

  return {
    format: 'svelte',
    artifacts: [{
      filename: `${componentName}.svelte`,
      content: `${script}\n\n<div class="${classPrefix}root ${classPrefix}${options.style || 'sketch'}">\n${markup}\n</div>\n\n<style>\n${styles}\n</style>`,
    }],
  };
}

function renderSvelteScript(analysis: ReturnType<typeof analyzeFrameworkState>, typescript: boolean): string {
  const lang = typescript ? ' lang="ts"' : '';
  const fieldDeclarations = analysis.fields
    .map((field) => `let ${field.key} = ${renderSvelteValue(field.initialValue)};`)
    .join('\n');
  const reactiveObject = analysis.fields.length === 0
    ? '$: formState = {};'
    : `$: formState = { ${analysis.fields.map((field) => field.key).join(', ')} };`;

  return `<script${lang}>
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  ${fieldDeclarations || ''}
  ${reactiveObject}

  function handleSubmit() {
    dispatch('submit', formState);
  }

  function handleButtonClick(label${typescript ? ': string' : ''}) {
    dispatch('button-click', label);
  }
</script>`;
}

function renderSvelteNode(node: WiremdNode, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);

  if (isAnnotationOnlyNode(node) && !context.showAnnotations) {
    return '';
  }

  let rendered: string;

  switch (node.type) {
    case 'button':
      rendered = renderSvelteButton(node, context, indent);
      break;
    case 'input':
      rendered = renderSvelteInput(node, context, indent);
      break;
    case 'textarea':
      rendered = renderSvelteTextarea(node, context, indent);
      break;
    case 'select':
      rendered = renderSvelteSelect(node, context, indent);
      break;
    case 'checkbox':
      rendered = renderSvelteCheckbox(node, context, indent);
      break;
    case 'radio':
      rendered = renderSvelteRadio(node, context, indent);
      break;
    case 'radio-group':
      rendered = renderSvelteWrapper('div', 'radio-group', node.children, node.props, context, indent);
      break;
    case 'icon':
      rendered = `${spaces}<span class="${buildPrefixedClasses(context.classPrefix, 'icon', node.props)}" data-icon="${escapeHtml(node.props.name)}" aria-label="${escapeHtml(node.props.name)}">${getIconGlyph(node.props.name)}</span>`;
      break;
    case 'container':
      rendered = renderSvelteWrapper('div', `container-${node.containerType}`, node.children, node.props, context, indent);
      break;
    case 'nav':
      rendered = renderSvelteWrapper('nav', 'nav', node.children, node.props, context, indent);
      break;
    case 'nav-item':
      rendered = renderSvelteNavItem(node, context, indent);
      break;
    case 'brand':
      rendered = renderSvelteWrapper('div', 'brand', node.children, node.props, context, indent);
      break;
    case 'grid':
      rendered = renderSvelteGrid(node, context, indent);
      break;
    case 'grid-item':
      rendered = renderSvelteWrapper('div', 'grid-item', node.children, node.props, context, indent);
      break;
    case 'form':
      rendered = renderSvelteForm(node, context, indent);
      break;
    case 'heading':
      rendered = renderSvelteHeading(node, context, indent);
      break;
    case 'paragraph':
      rendered = renderSvelteParagraph(node, context, indent);
      break;
    case 'text':
      rendered = `${spaces}${escapeHtml(node.content)}`;
      break;
    case 'image':
      rendered = renderSvelteImage(node, context, indent);
      break;
    case 'link':
      rendered = renderSvelteLink(node, context, indent);
      break;
    case 'list':
      rendered = renderSvelteList(node, context, indent);
      break;
    case 'list-item':
      rendered = renderSvelteListItem(node, context, indent);
      break;
    case 'table':
      rendered = renderSvelteTable(node, context, indent);
      break;
    case 'table-header':
      rendered = renderSvelteTableHeader(node, context, indent);
      break;
    case 'table-row':
      rendered = renderSvelteTableRow(node, context, indent);
      break;
    case 'table-cell':
      rendered = renderSvelteTableCell(node, context, indent);
      break;
    case 'blockquote':
      rendered = renderSvelteWrapper('blockquote', 'blockquote', node.children, node.props, context, indent);
      break;
    case 'code':
      rendered = renderSvelteCode(node, context, indent);
      break;
    case 'separator':
      rendered = `${spaces}<hr class="${buildPrefixedClasses(context.classPrefix, 'separator', node.props)}" />`;
      break;
    case 'alert':
      rendered = renderSvelteWrapper('div', `state-${node.alertType}`, node.children, node.props, context, indent);
      break;
    case 'badge':
      rendered = `${spaces}<span class="${buildPrefixedClasses(context.classPrefix, 'badge', node.props)}">${escapeHtml(node.content)}</span>`;
      break;
    case 'loading-state':
      rendered = renderSvelteStateBlock(node.message || 'Loading...', node.children || [], node.props, context, indent, 'clock', 'loading-state');
      break;
    case 'empty-state':
      rendered = renderSvelteStateBlock(node.title || 'Empty state', node.children, node.props, context, indent, node.icon, 'empty-state');
      break;
    case 'error-state':
      rendered = renderSvelteStateBlock(node.title || 'Error state', node.children, node.props, context, indent, node.icon, 'error-state');
      break;
    default:
      rendered = `${spaces}<!-- Unsupported node type: ${(node as { type: string }).type} -->`;
      break;
  }

  return appendSvelteAnnotationMarkup(rendered, ('props' in node && node.props) ? node.props : {}, context, indent);
}

function renderSvelteButton(node: NodeOf<'button'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'button', node.props);
  const buttonType = node.props.type || (node.props.variant === 'primary' ? 'submit' : 'button');
  const disabled = (node.props.disabled || getStates(node.props).includes('disabled')) ? ' disabled' : '';
  const clickHandler = buttonType === 'submit' ? '' : ` on:click={() => handleButtonClick('${escapeJsString(node.content || 'button')}')}`;
  const content = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');

  return `${spaces}<button class="${classes}" type="${buttonType}"${disabled}${clickHandler}>${content}</button>`;
}

function renderSvelteInput(node: NodeOf<'input'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'input', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'field', 'field');
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const disabled = (node.props.disabled || getStates(node.props).includes('disabled')) ? ' disabled' : '';
  return `${spaces}<input bind:value={${field}} type="${node.props.inputType || node.props.type || 'text'}" class="${classes}"${placeholder}${disabled} />`;
}

function renderSvelteTextarea(node: NodeOf<'textarea'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'textarea', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'field', 'field');
  const rows = node.props.rows || 4;
  return `${spaces}<textarea bind:value={${field}} class="${classes}" rows="${rows}"></textarea>`;
}

function renderSvelteSelect(node: NodeOf<'select'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'select', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'select', 'select');
  const options = node.options
    .map((option) => `${spaces}  <option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join('\n');
  return `${spaces}<select bind:value={${field}} class="${classes}">\n${options}\n${spaces}</select>`;
}

function renderSvelteCheckbox(node: NodeOf<'checkbox'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'checkbox', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.label || 'checkbox', 'checkbox');
  const label = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.label || '');
  return `${spaces}<label class="${classes}"><input bind:checked={${field}} type="checkbox" /> <span>${label}</span></label>`;
}

function renderSvelteRadio(node: NodeOf<'radio'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'radio', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.label, 'radioGroup');
  const value = escapeHtml(typeof node.props.value === 'string' ? node.props.value : node.label);
  return `${spaces}<label class="${classes}"><input bind:group={${field}} type="radio" value="${value}" /> <span>${escapeHtml(node.label)}</span></label>`;
}

function renderSvelteForm(node: NodeOf<'form'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'form', node.props);
  const children = node.children.map((child) => renderSvelteNode(child, context, indent + 1)).join('\n');
  return `${spaces}<form class="${classes}" on:submit|preventDefault={handleSubmit}>\n${children}\n${spaces}</form>`;
}

function renderSvelteHeading(node: NodeOf<'heading'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, `h${node.level}`, node.props);
  const content = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<h${node.level} class="${classes}">${content}</h${node.level}>`;
}

function renderSvelteParagraph(node: NodeOf<'paragraph'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'paragraph', node.props);
  const content = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<p class="${classes}">${content}</p>`;
}

function renderSvelteImage(node: NodeOf<'image'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'image', node.props);
  return `${spaces}<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" class="${classes}" />`;
}

function renderSvelteLink(node: NodeOf<'link'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'link', node.props);
  const content = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<a href="${escapeHtml(node.href)}" class="${classes}">${content}</a>`;
}

function renderSvelteList(node: NodeOf<'list'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const tag = node.ordered ? 'ol' : 'ul';
  const classes = buildPrefixedClasses(context.classPrefix, 'list', node.props);
  const children = node.children.map((child) => renderSvelteNode(child, context, indent + 1)).join('\n');
  return `${spaces}<${tag} class="${classes}">\n${children}\n${spaces}</${tag}>`;
}

function renderSvelteListItem(node: NodeOf<'list-item'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'list-item', node.props);
  const content = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<li class="${classes}">${content}</li>`;
}

function renderSvelteTable(node: NodeOf<'table'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'table', node.props);
  const children = node.children.map((child) => renderSvelteNode(child, context, indent + 1)).join('\n');
  return `${spaces}<table class="${classes}">\n${children}\n${spaces}</table>`;
}

function renderSvelteTableHeader(node: NodeOf<'table-header'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const children = node.children.map((child) => renderSvelteNode(child, context, indent + 2)).join('\n');
  return `${spaces}<thead>\n${spaces}  <tr>\n${children}\n${spaces}  </tr>\n${spaces}</thead>`;
}

function renderSvelteTableRow(node: NodeOf<'table-row'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const children = node.children.map((child) => renderSvelteNode(child, context, indent + 1)).join('\n');
  return `${spaces}<tr>\n${children}\n${spaces}</tr>`;
}

function renderSvelteTableCell(node: NodeOf<'table-cell'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const tag = node.header ? 'th' : 'td';
  const classes = buildPrefixedClasses(context.classPrefix, `table-cell ${context.classPrefix}align-${node.align || 'left'}`, {});
  const content = node.children && node.children.length > 0
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<${tag} class="${classes}">${content}</${tag}>`;
}

function renderSvelteCode(node: NodeOf<'code'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  if (node.inline !== false) {
    return `${spaces}<code class="${buildPrefixedClasses(context.classPrefix, 'code-inline', {})}">${escapeHtml(node.value)}</code>`;
  }

  return `${spaces}<pre class="${buildPrefixedClasses(context.classPrefix, 'code-block', {})}"><code>${escapeHtml(node.value)}</code></pre>`;
}

function renderSvelteGrid(node: NodeOf<'grid'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const responsiveClass = buildResponsiveGridClasses(context.classPrefix, node.props?.responsive?.gridColumns);
  const classes = `${buildPrefixedClasses(context.classPrefix, 'grid', node.props)} ${context.classPrefix}grid-${node.columns}${responsiveClass ? ` ${responsiveClass}` : ''}`;
  const children = node.children.map((child) => renderSvelteNode(child, context, indent + 1)).join('\n');
  return `${spaces}<div class="${classes}" style="--grid-columns: ${node.columns}">\n${children}\n${spaces}</div>`;
}

function renderSvelteNavItem(node: NodeOf<'nav-item'>, context: SvelteContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'nav-item', node.props);
  const content = node.children
    ? node.children.map((child) => renderSvelteNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<a href="${escapeHtml(node.href || '#')}" class="${classes}">${content}</a>`;
}

function renderSvelteWrapper(
  tag: string,
  baseClass: string,
  children: WiremdNode[],
  props: Record<string, unknown>,
  context: SvelteContext,
  indent: number,
): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, baseClass, props);
  const content = children.map((child) => renderSvelteNode(child, context, indent + 1)).filter(Boolean).join('\n');
  return `${spaces}<${tag} class="${classes}">\n${content}\n${spaces}</${tag}>`;
}

function renderSvelteStateBlock(
  title: string,
  children: WiremdNode[],
  props: Record<string, unknown>,
  context: SvelteContext,
  indent: number,
  icon?: string,
  stateKind = 'empty-state',
): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = `${buildPrefixedClasses(context.classPrefix, 'state-block', props)} ${context.classPrefix}container-${stateKind}`;
  const content = children.map((child) => renderSvelteNode(child, context, indent + 1)).filter(Boolean).join('\n');
  const iconMarkup = icon ? `<span data-icon="${escapeHtml(icon)}">${getIconGlyph(icon)}</span>` : '';
  return `${spaces}<div class="${classes}">\n${spaces}  <strong>${iconMarkup}${escapeHtml(title)}</strong>\n${content ? `${content}\n` : ''}${spaces}</div>`;
}

function appendSvelteAnnotationMarkup(
  rendered: string,
  props: Record<string, unknown>,
  context: SvelteContext,
  indent: number,
): string {
  if (!context.showAnnotations) {
    return rendered;
  }

  const annotationText = buildAnnotationText(props);
  if (!annotationText) {
    return rendered;
  }

  const spaces = repeatString('  ', indent + 1);
  return `${rendered}\n${spaces}<aside class="${context.classPrefix}annotation-callout">${escapeHtml(annotationText)}</aside>`;
}

function renderSvelteValue(value: string | boolean | string[]): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => `'${escapeJsString(entry)}'`).join(', ')}]`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return `'${escapeJsString(value)}'`;
}
