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

interface AngularOptions extends RenderOptions {
  componentName?: string;
  selector?: string;
  standalone?: boolean;
  inlineStyles?: boolean;
}

interface AngularContext {
  classPrefix: string;
  analysis: ReturnType<typeof analyzeFrameworkState>;
  helpers: RenderHelpers;
  showAnnotations: boolean;
}

export function renderAngularArtifacts(
  ast: DocumentNode,
  options: AngularOptions = {},
  helpers: RenderHelpers,
): RenderResult {
  const classPrefix = options.classPrefix || 'wmd-';
  const componentName = options.componentName || 'WiremdComponent';
  const selector = options.selector || `app-${helpers.toKebabCase(componentName, 'wiremd')}`;
  const standalone = options.standalone !== false;
  const analysis = analyzeFrameworkState(ast, helpers);
  const context: AngularContext = {
    classPrefix,
    analysis,
    helpers,
    showAnnotations: Boolean(options.showAnnotations),
  };
  const baseName = `${helpers.toKebabCase(componentName, 'wiremd')}.component`;
  const template = `<div class="${classPrefix}root ${classPrefix}${options.style || 'sketch'}">\n${ast.children.map((child) => renderAngularNode(child, context, 0)).join('\n')}\n</div>`;
  const styles = getStyleCSS(options.style || 'sketch', classPrefix);
  const componentTs = renderAngularComponentTs(componentName, selector, baseName, analysis, styles, standalone, Boolean(options.inlineStyles));

  const artifacts = [
    { filename: `${baseName}.ts`, content: componentTs },
    { filename: `${baseName}.html`, content: template },
  ];

  if (!options.inlineStyles) {
    artifacts.push({ filename: `${baseName}.css`, content: styles });
  }

  return {
    format: 'angular',
    artifacts,
  };
}

function renderAngularComponentTs(
  componentName: string,
  selector: string,
  baseName: string,
  analysis: ReturnType<typeof analyzeFrameworkState>,
  styles: string,
  standalone: boolean,
  inlineStyles: boolean,
): string {
  const controls = analysis.fields.length === 0
    ? '    placeholder: this.fb.control(\'\'),'
    : analysis.fields.map((field) => `    ${field.key}: this.fb.control(${renderAngularValue(field.initialValue)}),`).join('\n');
  const styleMetadata = inlineStyles
    ? `styles: [\`${styles.replace(/`/g, '\\`')}\`]`
    : `styleUrls: ['./${baseName}.css']`;
  const standaloneMetadata = standalone ? '  standalone: true,\n  imports: [CommonModule, ReactiveFormsModule],\n' : '';

  return `import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: '${selector}',
${standaloneMetadata}  templateUrl: './${baseName}.html',
  ${styleMetadata},
})
export class ${componentName} {
  @Output() submitted = new EventEmitter<Record<string, unknown>>();
  @Output() buttonClick = new EventEmitter<string>();

  readonly form = this.fb.group({
${controls}
  });

  constructor(private readonly fb: FormBuilder) {}

  handleSubmit(): void {
    this.submitted.emit(this.form.getRawValue() as Record<string, unknown>);
  }

  handleButtonClick(label: string): void {
    this.buttonClick.emit(label);
  }
}`;
}

function renderAngularNode(node: WiremdNode, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);

  if (isAnnotationOnlyNode(node) && !context.showAnnotations) {
    return '';
  }

  let rendered: string;

  switch (node.type) {
    case 'button':
      rendered = renderAngularButton(node, context, indent);
      break;
    case 'input':
      rendered = renderAngularInput(node, context, indent);
      break;
    case 'textarea':
      rendered = renderAngularTextarea(node, context, indent);
      break;
    case 'select':
      rendered = renderAngularSelect(node, context, indent);
      break;
    case 'checkbox':
      rendered = renderAngularCheckbox(node, context, indent);
      break;
    case 'radio':
      rendered = renderAngularRadio(node, context, indent);
      break;
    case 'radio-group':
      rendered = renderAngularWrapper('div', 'radio-group', node.children, node.props, context, indent);
      break;
    case 'icon':
      rendered = `${spaces}<span class="${buildPrefixedClasses(context.classPrefix, 'icon', node.props)}" data-icon="${escapeHtml(node.props.name)}" aria-label="${escapeHtml(node.props.name)}">${getIconGlyph(node.props.name)}</span>`;
      break;
    case 'container':
      rendered = renderAngularWrapper('div', `container-${node.containerType}`, node.children, node.props, context, indent);
      break;
    case 'nav':
      rendered = renderAngularWrapper('nav', 'nav', node.children, node.props, context, indent);
      break;
    case 'nav-item':
      rendered = renderAngularNavItem(node, context, indent);
      break;
    case 'brand':
      rendered = renderAngularWrapper('div', 'brand', node.children, node.props, context, indent);
      break;
    case 'grid':
      rendered = renderAngularGrid(node, context, indent);
      break;
    case 'grid-item':
      rendered = renderAngularWrapper('div', 'grid-item', node.children, node.props, context, indent);
      break;
    case 'form':
      rendered = renderAngularForm(node, context, indent);
      break;
    case 'heading':
      rendered = renderAngularHeading(node, context, indent);
      break;
    case 'paragraph':
      rendered = renderAngularParagraph(node, context, indent);
      break;
    case 'text':
      rendered = `${spaces}${escapeHtml(node.content)}`;
      break;
    case 'image':
      rendered = renderAngularImage(node, context, indent);
      break;
    case 'link':
      rendered = renderAngularLink(node, context, indent);
      break;
    case 'list':
      rendered = renderAngularList(node, context, indent);
      break;
    case 'list-item':
      rendered = renderAngularListItem(node, context, indent);
      break;
    case 'table':
      rendered = renderAngularTable(node, context, indent);
      break;
    case 'table-header':
      rendered = renderAngularTableHeader(node, context, indent);
      break;
    case 'table-row':
      rendered = renderAngularTableRow(node, context, indent);
      break;
    case 'table-cell':
      rendered = renderAngularTableCell(node, context, indent);
      break;
    case 'blockquote':
      rendered = renderAngularWrapper('blockquote', 'blockquote', node.children, node.props, context, indent);
      break;
    case 'code':
      rendered = renderAngularCode(node, context, indent);
      break;
    case 'separator':
      rendered = `${spaces}<hr class="${buildPrefixedClasses(context.classPrefix, 'separator', node.props)}" />`;
      break;
    case 'alert':
      rendered = renderAngularWrapper('div', `state-${node.alertType}`, node.children, node.props, context, indent);
      break;
    case 'badge':
      rendered = `${spaces}<span class="${buildPrefixedClasses(context.classPrefix, 'badge', node.props)}">${escapeHtml(node.content)}</span>`;
      break;
    case 'loading-state':
      rendered = renderAngularStateBlock(node.message || 'Loading...', node.children || [], node.props, context, indent, 'clock', 'loading-state');
      break;
    case 'empty-state':
      rendered = renderAngularStateBlock(node.title || 'Empty state', node.children, node.props, context, indent, node.icon, 'empty-state');
      break;
    case 'error-state':
      rendered = renderAngularStateBlock(node.title || 'Error state', node.children, node.props, context, indent, node.icon, 'error-state');
      break;
    default:
      rendered = `${spaces}<!-- Unsupported node type: ${(node as { type: string }).type} -->`;
      break;
  }

  return appendAngularAnnotationMarkup(rendered, ('props' in node && node.props) ? node.props : {}, context, indent);
}

function renderAngularButton(node: NodeOf<'button'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'button', node.props);
  const buttonType = node.props.type || (node.props.variant === 'primary' ? 'submit' : 'button');
  const disabled = (node.props.disabled || getStates(node.props).includes('disabled')) ? ' disabled' : '';
  const clickHandler = buttonType === 'submit' ? '' : ` (click)="handleButtonClick('${escapeHtml(node.content || 'button')}')"`;
  const content = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<button class="${classes}" type="${buttonType}"${disabled}${clickHandler}>${content}</button>`;
}

function renderAngularInput(node: NodeOf<'input'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'input', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'field', 'field');
  const placeholder = node.props.placeholder ? ` placeholder="${escapeHtml(node.props.placeholder)}"` : '';
  const disabled = (node.props.disabled || getStates(node.props).includes('disabled')) ? ' disabled' : '';
  return `${spaces}<input [formControl]="form.controls.${field}" type="${node.props.inputType || node.props.type || 'text'}" class="${classes}"${placeholder}${disabled} />`;
}

function renderAngularTextarea(node: NodeOf<'textarea'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'textarea', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'field', 'field');
  return `${spaces}<textarea [formControl]="form.controls.${field}" class="${classes}"></textarea>`;
}

function renderAngularSelect(node: NodeOf<'select'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'select', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.props.placeholder as string || 'select', 'select');
  const options = node.options
    .map((option) => `${spaces}  <option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
    .join('\n');
  return `${spaces}<select [formControl]="form.controls.${field}" class="${classes}">\n${options}\n${spaces}</select>`;
}

function renderAngularCheckbox(node: NodeOf<'checkbox'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'checkbox', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.label || 'checkbox', 'checkbox');
  const label = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.label || '');
  return `${spaces}<label class="${classes}"><input [formControl]="form.controls.${field}" type="checkbox" /> <span>${label}</span></label>`;
}

function renderAngularRadio(node: NodeOf<'radio'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'radio', node.props);
  const field = context.analysis.nodeBindings.get(node) || context.helpers.toIdentifier(node.label, 'radioGroup');
  const value = escapeHtml(typeof node.props.value === 'string' ? node.props.value : node.label);
  return `${spaces}<label class="${classes}"><input [formControl]="form.controls.${field}" type="radio" value="${value}" /> <span>${escapeHtml(node.label)}</span></label>`;
}

function renderAngularForm(node: NodeOf<'form'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'form', node.props);
  const children = node.children.map((child) => renderAngularNode(child, context, indent + 1)).join('\n');
  return `${spaces}<form [formGroup]="form" class="${classes}" (ngSubmit)="handleSubmit()">\n${children}\n${spaces}</form>`;
}

function renderAngularHeading(node: NodeOf<'heading'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, `h${node.level}`, node.props);
  const content = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<h${node.level} class="${classes}">${content}</h${node.level}>`;
}

function renderAngularParagraph(node: NodeOf<'paragraph'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'paragraph', node.props);
  const content = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<p class="${classes}">${content}</p>`;
}

function renderAngularImage(node: NodeOf<'image'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'image', node.props);
  return `${spaces}<img src="${escapeHtml(node.src)}" alt="${escapeHtml(node.alt)}" class="${classes}" />`;
}

function renderAngularLink(node: NodeOf<'link'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'link', node.props);
  const content = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<a href="${escapeHtml(node.href)}" class="${classes}">${content}</a>`;
}

function renderAngularList(node: NodeOf<'list'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const tag = node.ordered ? 'ol' : 'ul';
  const classes = buildPrefixedClasses(context.classPrefix, 'list', node.props);
  const children = node.children.map((child) => renderAngularNode(child, context, indent + 1)).join('\n');
  return `${spaces}<${tag} class="${classes}">\n${children}\n${spaces}</${tag}>`;
}

function renderAngularListItem(node: NodeOf<'list-item'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'list-item', node.props);
  const content = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<li class="${classes}">${content}</li>`;
}

function renderAngularTable(node: NodeOf<'table'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'table', node.props);
  const children = node.children.map((child) => renderAngularNode(child, context, indent + 1)).join('\n');
  return `${spaces}<table class="${classes}">\n${children}\n${spaces}</table>`;
}

function renderAngularTableHeader(node: NodeOf<'table-header'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const children = node.children.map((child) => renderAngularNode(child, context, indent + 2)).join('\n');
  return `${spaces}<thead>\n${spaces}  <tr>\n${children}\n${spaces}  </tr>\n${spaces}</thead>`;
}

function renderAngularTableRow(node: NodeOf<'table-row'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const children = node.children.map((child) => renderAngularNode(child, context, indent + 1)).join('\n');
  return `${spaces}<tr>\n${children}\n${spaces}</tr>`;
}

function renderAngularTableCell(node: NodeOf<'table-cell'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const tag = node.header ? 'th' : 'td';
  const classes = buildPrefixedClasses(context.classPrefix, `table-cell ${context.classPrefix}align-${node.align || 'left'}`, {});
  const content = node.children && node.children.length > 0
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<${tag} class="${classes}">${content}</${tag}>`;
}

function renderAngularCode(node: NodeOf<'code'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  if (node.inline !== false) {
    return `${spaces}<code class="${buildPrefixedClasses(context.classPrefix, 'code-inline', {})}">${escapeHtml(node.value)}</code>`;
  }

  return `${spaces}<pre class="${buildPrefixedClasses(context.classPrefix, 'code-block', {})}"><code>${escapeHtml(node.value)}</code></pre>`;
}

function renderAngularGrid(node: NodeOf<'grid'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const responsiveClass = buildResponsiveGridClasses(context.classPrefix, node.props?.responsive?.gridColumns);
  const classes = `${buildPrefixedClasses(context.classPrefix, 'grid', node.props)} ${context.classPrefix}grid-${node.columns}${responsiveClass ? ` ${responsiveClass}` : ''}`;
  const children = node.children.map((child) => renderAngularNode(child, context, indent + 1)).join('\n');
  return `${spaces}<div class="${classes}" style="--grid-columns: ${node.columns}">\n${children}\n${spaces}</div>`;
}

function renderAngularNavItem(node: NodeOf<'nav-item'>, context: AngularContext, indent: number): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, 'nav-item', node.props);
  const content = node.children
    ? node.children.map((child) => renderAngularNode(child, context, -1)).join('')
    : escapeHtml(node.content || '');
  return `${spaces}<a href="${escapeHtml(node.href || '#')}" class="${classes}">${content}</a>`;
}

function renderAngularWrapper(
  tag: string,
  baseClass: string,
  children: WiremdNode[],
  props: Record<string, unknown>,
  context: AngularContext,
  indent: number,
): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = buildPrefixedClasses(context.classPrefix, baseClass, props);
  const content = children.map((child) => renderAngularNode(child, context, indent + 1)).filter(Boolean).join('\n');
  return `${spaces}<${tag} class="${classes}">\n${content}\n${spaces}</${tag}>`;
}

function renderAngularStateBlock(
  title: string,
  children: WiremdNode[],
  props: Record<string, unknown>,
  context: AngularContext,
  indent: number,
  icon?: string,
  stateKind = 'empty-state',
): string {
  const spaces = repeatString('  ', indent + 1);
  const classes = `${buildPrefixedClasses(context.classPrefix, 'state-block', props)} ${context.classPrefix}container-${stateKind}`;
  const content = children.map((child) => renderAngularNode(child, context, indent + 1)).filter(Boolean).join('\n');
  const iconMarkup = icon ? `<span data-icon="${escapeHtml(icon)}">${getIconGlyph(icon)}</span>` : '';
  return `${spaces}<div class="${classes}">\n${spaces}  <strong>${iconMarkup}${escapeHtml(title)}</strong>\n${content ? `${content}\n` : ''}${spaces}</div>`;
}

function appendAngularAnnotationMarkup(
  rendered: string,
  props: Record<string, unknown>,
  context: AngularContext,
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

function renderAngularValue(value: string | boolean | string[]): string {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => `'${escapeJsString(entry)}'`).join(', ')}]`;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return `'${escapeJsString(value)}'`;
}
