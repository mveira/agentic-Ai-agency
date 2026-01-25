import type { FrameworkBlock } from './types.js';

/**
 * Framework blocks are reusable prompt sections that can be injected
 * based on the type of task or domain being worked on.
 *
 * These are placeholders that will be populated from the CMS in production.
 */

/**
 * Marketing framework for content generation.
 */
export const MARKETING_FRAMEWORK: FrameworkBlock = {
  name: 'Marketing Framework',
  content: `### Marketing Content Guidelines

When generating marketing content:
- Understand the target audience demographics and psychographics
- Identify the key value proposition
- Use appropriate tone of voice for the brand
- Include clear calls-to-action
- Follow brand guidelines if provided

**Placeholder**: This framework will be populated from CMS with client-specific brand guidelines.`,
  priority: 50,
};

/**
 * Technical documentation framework.
 */
export const TECHNICAL_DOCS_FRAMEWORK: FrameworkBlock = {
  name: 'Technical Documentation',
  content: `### Technical Documentation Guidelines

When writing technical documentation:
- Start with a clear overview/summary
- Use consistent terminology throughout
- Include code examples where appropriate
- Document all parameters and return values
- Provide troubleshooting guidance for common issues

**Placeholder**: This framework will be populated from CMS with project-specific standards.`,
  priority: 50,
};

/**
 * E-commerce product framework.
 */
export const ECOMMERCE_FRAMEWORK: FrameworkBlock = {
  name: 'E-commerce Framework',
  content: `### E-commerce Guidelines

When working with e-commerce data:
- Prioritize product accuracy (prices, availability, specifications)
- Follow SEO best practices for product descriptions
- Consider mobile-first presentation
- Respect inventory and pricing data freshness

**Placeholder**: This framework will be populated from CMS with platform-specific guidelines (Shopify, WooCommerce, etc.).`,
  priority: 50,
};

/**
 * Client communication framework.
 */
export const CLIENT_COMMUNICATION_FRAMEWORK: FrameworkBlock = {
  name: 'Client Communication',
  content: `### Client Communication Guidelines

When communicating with clients:
- Be professional and courteous
- Set clear expectations about deliverables and timelines
- Document all decisions and approvals
- Escalate blockers promptly
- Confirm understanding before proceeding

**Placeholder**: This framework will be populated from CMS with agency-specific communication templates.`,
  priority: 40,
};

/**
 * Get all default frameworks.
 */
export function getDefaultFrameworks(): FrameworkBlock[] {
  return [
    MARKETING_FRAMEWORK,
    TECHNICAL_DOCS_FRAMEWORK,
    ECOMMERCE_FRAMEWORK,
    CLIENT_COMMUNICATION_FRAMEWORK,
  ];
}

/**
 * Get framework by name.
 */
export function getFrameworkByName(name: string): FrameworkBlock | undefined {
  return getDefaultFrameworks().find(
    (f) => f.name.toLowerCase() === name.toLowerCase()
  );
}
