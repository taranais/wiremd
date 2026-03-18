# wiremd Syntax Guide

This guide covers the wiremd syntax for creating UI wireframes. For the complete specification, see [SYNTAX-SPEC-v0.2.md](../../SYNTAX-SPEC-v0.2.md).

<!-- syntax-sync:begin syntax-guide-overview -->
### Tracked Syntax Inventory

This block is generated from `syntax/manifest.json` and kept in sync with the conformance suites. Run `npm run syntax:generate` after manifest or conformance changes.

| Feature | Status | Spec | Conformance | Canonical Example |
|---|---|---|---|---|
| `document-structure` | implemented | 11.1, 11.2 | `01-document-structure.test.ts` | `## Dashboard` |
| `buttons-and-links` | implemented | 2.1, 10.1 | `02-components.test.ts` | `[Submit]{.primary}` |
| `text-inputs` | implemented | 2.2, 10.2 | `02-components.test.ts` | `[Email___]{type:email required}` |
| `textareas` | implemented | 2.3 | `02-components.test.ts` | `[Message...]{rows:5}` |
| `selects` | implemented | 2.4 | `02-components.test.ts` | `[Select topic___v]` |
| `radios-and-checkboxes` | implemented | 2.5, 2.6 | `02-components.test.ts` | `(•) Selected option` |
| `icons` | implemented | 2.7 | `02-components.test.ts` | `:house: :user:` |
| `containers` | implemented | 3.1 | `03-containers.test.ts` | `::: hero` |
| `inline-navigation` | implemented | 3.2, 7.1 | `03-containers.test.ts`<br>`08-ast-contracts.test.ts` | `[[ :logo: Brand \| Home \| [Sign In] ]]` |
| `grid-layouts` | implemented | 4.1 | `04-layouts.test.ts` | `## Features {.grid-3 .md:grid-2 .sm:grid-1}` |
| `viewport-blocks` | implemented | 4.2 | `04-layouts.test.ts` | `::: mobile` |
| `sidebar-main-layout` | implemented | 4.3 | `04-layouts.test.ts` | `::: layout {.sidebar-main}` |
| `attributes` | implemented | 5.1, 5.2, 5.4, 10.4 | `05-attributes.test.ts` | `[Submit]{.primary type:submit}` |
| `states` | implemented | 5.3, 8.1, 8.2 | `05-attributes.test.ts`<br>`06-special-patterns.test.ts` | `[Submit]{:loading}` |
| `annotations` | implemented | 5.5, 11.4 | `05-attributes.test.ts`<br>`08-ast-contracts.test.ts` | `[Submit] <!-- Primary CTA -->` |
| `placeholders` | implemented | 5.6 | `05-attributes.test.ts` | `{{user.name}}` |
| `special-patterns` | implemented | 7.2, 7.3, 7.4, 8.3, 8.4, 8.5 | `06-special-patterns.test.ts` | `Home > Products > Details` |
| `native-markdown` | implemented | 6.1, 6.2, 6.3, 6.4, 6.5, 6.6 | `07-native-markdown.test.ts` | `\| Name \| Role \|` |
| `ast-contracts` | implemented | 10.3, 11.4 | `08-ast-contracts.test.ts` | `<div class="raw">hello</div>` |

> Managed by `scripts/syntax-sync.mjs`. Manual edits inside this block will be overwritten.
<!-- syntax-sync:end syntax-guide-overview -->

## Basic Syntax

### Headings

Headings define sections and structure:

```markdown
# Page Title
## Section Heading
### Subsection
```

### Buttons

Square brackets create buttons:

```markdown
[Click Me]
[Submit]{.primary}
[Cancel]{.secondary}
```

### Text Inputs

Underscores create text inputs:

```markdown
[_____________________________]
[_____________________________]{type:email required}
[_____________________________]{placeholder:"Enter your name"}
```

### Textareas

Stacked brackets create textareas:

```markdown
[                             ]
[                             ]
[_____________________________]{rows:5}
```

### Dropdowns/Select

Bracket followed by a list creates a dropdown:

```markdown
Country
[Select a country___________v]
- United States
- Canada
- United Kingdom
```

## Advanced Features

### Classes and Attributes

Add classes with `.classname`:

```markdown
[Login]{.primary .large}
```

Add attributes with `key:value`:

```markdown
[Email]{type:email required}
```

Combine both:

```markdown
[Submit]{.primary type:submit disabled}
```

### Inline Containers

Group elements inline with `[[...]]`:

```markdown
[[ Logo | Home | Products | About ]]
```

### Block Containers

Group elements in blocks with `:::`:

```markdown
::: hero
# Welcome
Try our product today
[Get Started]{.primary}
:::
```

### Grid Layouts

Create grids with heading modifiers:

```markdown
## Features {.grid-3}

### Fast
Lightning quick performance

### Secure
Enterprise-grade security

### Scalable
Grows with your needs
```

### Responsive Breakpoints

You can define grid columns per breakpoint in the same heading:

```markdown
## Features {.grid-3 .md:grid-2 .sm:grid-1}
```

You can also target whole blocks to specific viewports:

```markdown
::: mobile
## Features {.grid-1}
:::

::: desktop
## Features {.grid-3}
:::
```

### Component States

Inline states:

```markdown
[Submit]{:disabled}
[Submit]{:hover}
[Submit]{:loading}
```

State blocks (applied to children unless they already define an explicit state):

```markdown
::: state=hover
[Submit]
:::
```

Supported states: `hover`, `active`, `focus`, `disabled`, `loading`, `error`, `success`, `warning`.

### Annotations and Comments

Inline comments (stored in AST/JSON, hidden by default in visual renders):

```markdown
[Submit] <!-- This should be primary CTA -->
```

Annotation attributes:

```markdown
## Hero {.annotation="Needs approval from design team"}
```

Note blocks:

```markdown
::: note
This section is pending final copy from marketing.
:::
```

Show annotations in HTML output:

```bash
wiremd wireframe.md --show-annotations
```

### Data Placeholders

Generate mock content directly in your wiremd documents:

```markdown
{{user.name}}
{{user.email}}
{{lorem:2}}
{{image:400x300}}
{{date}}
{{number:1000-9999}}
```

Use placeholders inside headings, paragraphs, labels, and image URLs:

```markdown
## Welcome {{user.name}}

Contact: {{user.email}}

![Hero image]({{image:1280x720}})
```

CLI options:

```bash
# Deterministic placeholder output
wiremd wireframe.md --seed demo-2026

# Keep placeholders as literal text
wiremd wireframe.md --no-placeholders
```

## Component Examples

### Forms

```markdown
## Contact Form

Name
[_____________________________]{required}

Email
[_____________________________]{type:email required}

Message
[                             ]
[                             ]
[_____________________________]{rows:5}

[Send]{.primary} [Cancel]
```

### Navigation

```markdown
[[ Logo | Home | Products | Pricing | About | [Login] ]]
```

### Cards

```markdown
::: card
### Product Name
This is a great product that solves your problems.
**$99/month**
[Buy Now]{.primary}
:::
```

### Tables

```markdown
| Feature | Basic | Pro |
|---------|-------|-----|
| Users   | 10    | Unlimited |
| Storage | 1GB   | 100GB |
```

## Styling

### Visual Styles

wiremd supports multiple visual styles:

```bash
wiremd file.md --style sketch    # Default Balsamiq-style
wiremd file.md --style clean     # Modern minimal
wiremd file.md --style wireframe # Traditional grayscale
wiremd file.md --style material  # Material Design
wiremd file.md --style tailwind  # Tailwind-inspired
wiremd file.md --style brutal    # Brutalist
```

### Custom Classes

Add custom classes to any element:

```markdown
## Header {.sticky .top}
[Button]{.btn .btn-primary .btn-lg}
```

## Best Practices

1. **Use semantic headings** - Maintain proper heading hierarchy
2. **Add labels** - Put text above inputs to label them
3. **Use attributes** - Specify input types and requirements
4. **Group related items** - Use containers to organize content
5. **Be consistent** - Follow the same patterns throughout

## Tips & Tricks

### Quick Buttons

```markdown
[Yes] [No] [Maybe]
```

### Password Input

```markdown
Password
[_____________________________]{type:password}
```

### Disabled State

```markdown
[Submit]{:disabled}
```

### Icons (with text)

```markdown
[🔍 Search]
[❤️ Like]
[⚙️ Settings]
```

### Multi-column Layout

```markdown
## Two Columns {.grid-2}

### Left Column
Content here

### Right Column
Content here
```

## Next Steps

- [Complete Syntax Specification](../../SYNTAX-SPEC-v0.2.md)
- [API Documentation](../api/)
- [Examples Gallery](../examples/)
