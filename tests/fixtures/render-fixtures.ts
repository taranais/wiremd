import type { DocumentNode } from '../../src/types.js';

export function createFrameworkRendererMarkdown(): string {
  return `
[[ :logo: Wiremd | Docs | Pricing ]]

## Profile settings

[Email___]{type:email required}

[Message...]{rows:4}

[Select topic____v]
- Sales
- Support

[x] Accept terms

(•) Email
( ) Phone

[Save]*
[Cancel]

## Metrics {.grid-2}
### Usage
Track activity

### All systems nominal

| Metric | Value |
| --- | ---: |
| Uptime | 99.9% |
  `.trim();
}

export function createFrameworkSeededAst(): DocumentNode {
  return {
    type: 'document',
    version: '0.2',
    meta: {
      title: 'Seeded Framework Fixture',
    },
    children: [
      {
        type: 'heading',
        level: 2,
        content: 'Seeded controls',
        props: {},
      },
      {
        type: 'form',
        props: {},
        children: [
          {
            type: 'input',
            props: {
              name: 'email',
              placeholder: 'Email',
              inputType: 'email',
              required: true,
            },
          },
          {
            type: 'textarea',
            props: {
              name: 'message',
              placeholder: 'Message',
              rows: 5,
              value: 'Hello from wiremd',
            },
          },
          {
            type: 'select',
            props: {
              name: 'topic',
              placeholder: 'Choose topic',
            },
            options: [
              {
                type: 'option',
                value: 'sales',
                label: 'Sales',
              },
              {
                type: 'option',
                value: 'support',
                label: 'Support',
                selected: true,
              },
            ],
          },
          {
            type: 'checkbox',
            label: 'Accept terms',
            checked: true,
            props: {
              name: 'accept_terms',
            },
          },
          {
            type: 'radio-group',
            name: 'contact_method',
            props: {
              inline: true,
            },
            children: [
              {
                type: 'radio',
                label: 'Email',
                selected: true,
                props: {
                  value: 'email',
                },
              },
              {
                type: 'radio',
                label: 'Phone',
                selected: false,
                props: {
                  value: 'phone',
                },
              },
            ],
          },
          {
            type: 'button',
            content: 'Save',
            props: {
              variant: 'primary',
              type: 'submit',
            },
          },
        ],
      },
    ],
  };
}
