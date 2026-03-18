# wiremd FAQ & Troubleshooting

> Common questions, issues, and solutions for wiremd users

## Table of Contents

- [Getting Started](#getting-started)
- [Syntax Questions](#syntax-questions)
- [Common Issues](#common-issues)
- [Components](#components)
- [Layout & Styling](#layout--styling)
- [Advanced Usage](#advanced-usage)

<!-- syntax-sync:begin faq-overview -->
### Tracked Syntax Inventory

This block is generated from `syntax/manifest.json` so FAQ syntax status stays aligned with the maintained implementation. Run `npm run syntax:generate` after manifest or conformance changes.

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
<!-- syntax-sync:end faq-overview -->

---

## Getting Started

### What is wiremd?

wiremd is a text-first UI design tool that lets you create wireframes and mockups using Markdown syntax. Write your UI in plain text, render it as HTML with various visual styles.

### How do I get started?

1. Check out the [Syntax Showcase](examples/showcase.md) for interactive examples
2. Use the [Quick Reference](QUICK-REFERENCE.md) for syntax lookups
3. See [Installation Guide](docs/guide/installation.md) for setup instructions

### What Markdown flavor does wiremd use?

wiremd is built on standard CommonMark Markdown with custom extensions for UI components. All standard Markdown syntax works as expected.

### Can I use wiremd without installing anything?

Currently, wiremd requires Node.js installation. A web-based version is planned for the future.

---

## Syntax Questions

### How do I know if something is a button or a link?

**Button:** `[Text]` - No URL following
**Link:** `[Text](url)` - Has URL in parentheses

```markdown
[Click Me]           # Button
[Click Me](http://example.com)  # Link
```

### Why isn't my input showing a label?

**Labels must be directly above inputs with NO blank line between them.**

```markdown
✅ Correct:
Name
[_____________________________]

❌ Wrong (blank line breaks association):
Name

[_____________________________]
```

### How do I create a dropdown with options?

Use the `v` suffix and put list items directly after:

```markdown
Country
[Select country...v]
- United States
- Canada
- United Kingdom
```

The list items must be directly after the dropdown (can have one blank line max).

### Can I put placeholder text in inputs?

Yes, put text before the underscores:

```markdown
[Enter your name___________]
[email@example.com_________]{type:email}
```

This syntax is implemented in the maintained v0.2 parser and conformance suite.

### How do I make a primary/highlighted button?

Three ways:

```markdown
[Submit]*                  # Asterisk shorthand
[Submit]{.primary}         # Class attribute
[Submit]{variant:primary}  # Variant attribute
```

---

## Common Issues

### My grid isn't working

**Check these:**

1. Grid class is on the parent heading: `## Title {.grid-3}`
2. Grid items are `###` headings (one level deeper)
3. Each grid item starts with `###`

```markdown
✅ Correct:
## Features {.grid-3}

### Feature 1
Content

### Feature 2
Content

❌ Wrong (missing ### for items):
## Features {.grid-3}
Feature 1
Feature 2
```

### Attributes are being ignored

**Common causes:**

1. **Too much space:** Attributes should be immediately after element (one space is OK)
   ```markdown
   ✅ [Button]{.primary}
   ✅ [Button] {.primary}
   ❌ [Button]   {.primary}  # Too much space
   ```

2. **Wrong syntax:** Use `{.class}` for classes, `{key:value}` for attributes
   ```markdown
   ✅ {.primary type:submit}
   ❌ {primary type=submit}
   ```

3. **Applied to wrong element:** Attributes apply to the immediately preceding element

### My navigation bar isn't rendering correctly

**Check the syntax:**

```markdown
✅ Correct:
[[ Home | Products | About ]]

❌ Wrong (missing spaces around pipes):
[[Home|Products|About]]

❌ Wrong (single brackets):
[ Home | Products | About ]
```

### Container not rendering

**Check for:**

1. Proper `:::` syntax with matching opening/closing
2. Space after `:::`
3. Container type is valid

```markdown
✅ Correct:
::: card
Content here
:::

❌ Wrong (no space after :::):
:::card
Content
:::

❌ Wrong (mismatched closing):
::: card
Content
::
```

### Icons not showing

**Check that:**

1. Icon syntax uses colons: `:icon-name:`
2. Icon name exists in the supported set
3. No spaces inside colons: `:home:` not `: home :`

```markdown
✅ Correct: :home: :user: :gear:
❌ Wrong: : home : :user-icon:
```

---

## Components

### What input types are supported?

All HTML5 input types:

```markdown
{type:text}      # Default
{type:email}     # Email with validation
{type:password}  # Password (hidden)
{type:tel}       # Telephone
{type:url}       # URL
{type:number}    # Number with spinners
{type:date}      # Date picker
{type:time}      # Time picker
{type:search}    # Search box
{type:color}     # Color picker
{type:file}      # File upload
```

### How do I create radio buttons?

Use the radio syntax with parentheses:

```markdown
Choose a plan:
- (*) Free Plan (selected)
- ( ) Pro Plan
- ( ) Enterprise
```

`(*)` indicates the selected radio button.

### How do I create checkboxes?

Use standard Markdown task list syntax:

```markdown
- [x] Checked item
- [ ] Unchecked item
- [x] Another checked item
```

### Can I create multi-line textareas?

Yes, use the `{rows:N}` attribute:

```markdown
Comments
[Your comments here...]{rows:5}

# Or with more attributes:
Description
[Describe your project...]{rows:8 cols:60}
```

### How do I create disabled or loading states?

Use state attributes:

```markdown
[Submit]{:disabled}
[Processing...]{:loading}
[Delete]{:error}
[Saved]{:success}
```

---

## Layout & Styling

### What grid sizes are supported?

Built-in grid classes:
- `{.grid-2}` - 2 columns
- `{.grid-3}` - 3 columns
- `{.grid-4}` - 4 columns
- `{.grid-auto}` - Auto-fit columns

### Can I nest containers?

Yes! Containers can be nested:

```markdown
::: hero
# Welcome

::: card
### Get Started
[Sign Up]*
:::
:::
```

### What visual styles are available?

wiremd supports multiple rendering styles:

```bash
--style sketch      # Default: Balsamiq-style hand-drawn
--style clean       # Modern minimal design
--style wireframe   # Traditional grayscale
--style material    # Material Design
--style tailwind    # Tailwind-inspired
--style brutal      # Neo-brutalist
--style none        # Unstyled semantic HTML
```

### How do I add custom CSS classes?

Use the class attribute syntax:

```markdown
## Section {.my-custom-class}
[Button]{.btn .btn-lg .custom}
```

Classes are applied to the rendered HTML element.

### Can I use inline styles?

Not currently. Use classes and apply CSS separately, or use the `style:none` option and add your own CSS.

---

## Advanced Usage

### Can I include one wiremd file in another?

Not yet. Template and partial includes are still outside the maintained v0.2 syntax set.

### How do I create responsive layouts?

Responsive syntax is implemented in v0.2.

Use breakpoint grid classes on the parent heading:

```markdown
## Features {.grid-3 .md:grid-2 .sm:grid-1}
```

Use viewport blocks when the content itself should differ by device:

```markdown
::: mobile
## Features {.grid-1}
:::

::: desktop
## Features {.grid-3}
:::
```

### Can I export to React/Vue/Svelte?

HTML export is fully supported. React/Vue/Svelte component exports are in development and planned for Phase 5.

### How do I create tabs or accordions?

The original v0.1 roadmap is preserved in [SYNTAX-SPEC-v0.1.md](SYNTAX-SPEC-v0.1.md#16-version-01-scope). The current maintained specification is [SYNTAX-SPEC-v0.2.md](SYNTAX-SPEC-v0.2.md).

### Can I add custom JavaScript interactions?

wiremd generates static HTML. For interactivity, you'll need to add JavaScript separately or wait for framework-specific renderers (React/Vue/Svelte).

### How do I create modal/dialog overlays?

Use the modal container:

```markdown
::: modal
### Confirm Action
Are you sure you want to proceed?

[Confirm]* [Cancel]
:::
```

The modal container is rendered but not automatically shown as an overlay. You'll need to add CSS/JS for overlay behavior.

### Can I validate forms?

HTML5 validation attributes are supported:

```markdown
Email
[_____________________________]{type:email required}

Age
[___]{type:number min:18 max:120}

Website
[_____________________________]{type:url}
```

The rendered HTML includes these validation attributes.

---

## Troubleshooting Checklist

When something isn't working, check:

- [ ] Is there a blank line where there shouldn't be? (especially labels and inputs)
- [ ] Are the brackets correct? `[[ ]]` for nav, `[ ]` for buttons/inputs
- [ ] Are attribute curly braces immediately after the element?
- [ ] For grids, is the class on `##` and items on `###`?
- [ ] For containers, is there a space after `:::`?
- [ ] For dropdowns, is the list directly after the `[...v]`?
- [ ] Are you using the right syntax? Check [Quick Reference](QUICK-REFERENCE.md)

---

## Getting Help

### Where can I find examples?

- [Syntax Showcase](examples/showcase.md) - Comprehensive interactive examples
- [Examples folder](examples/) - Various example files
- [Quick Reference](QUICK-REFERENCE.md) - Quick syntax lookup

### Where is the complete syntax specification?

See [SYNTAX-SPEC-v0.2.md](SYNTAX-SPEC-v0.2.md) for the formal specification including parser rules and JSON schema.

### How do I report a bug?

Check if it's a known issue in this FAQ, then:
1. Search existing issues at [github.com/yourusername/wiremd/issues](https://github.com/yourusername/wiremd/issues)
2. If not found, create a new issue with:
   - Your wiremd syntax (minimal reproduction)
   - Expected behavior
   - Actual behavior
   - wiremd version

### How do I request a feature?

Open an issue on GitHub with:
- Clear description of the feature
- Use case / why it's needed
- Example syntax (if applicable)

### Is there a community/forum?

Check the GitHub Discussions page for community support and discussions.

---

## Known Limitations (v0.2)

These are known issues that will be addressed in future versions:

1. **Tabs and accordions** are documented as future syntax, not maintained features
2. **File upload inputs** have limited styling
3. **No template/partial system** for reusable components
4. **No JavaScript interactivity** in rendered output
5. **Framework exports are still uneven** across render targets

See the [roadmap](markdown-mockup-project-plan.md) for planned features.

---

*Last updated: 2025-11-15*
