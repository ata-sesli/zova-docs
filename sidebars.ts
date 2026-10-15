import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {type: 'category', label: 'Get started', items: ['get-started/installation', 'get-started/first-database']},
    {type: 'category', label: 'Core storage', items: ['core/records', 'core/key-value', 'core/objects', 'core/vectors', 'core/graphs', 'core/sql']},
    {type: 'category', label: 'Guides', items: ['guides/sqlite-migration', 'guides/bound-stores', 'guides/vector-search', 'guides/graph-traversal', 'guides/extensions', 'guides/app-events']},
    {type: 'category', label: 'Bindings', items: ['bindings/javascript', 'bindings/wasm', 'bindings/rust', 'bindings/python', 'bindings/go', 'bindings/c-abi', 'bindings/zig']},
    {type: 'category', label: 'Operations', items: ['operations/safety', 'operations/diagnostics', 'operations/compatibility', 'operations/api-stability', 'operations/release-artifacts', 'operations/limitations']},
    {type: 'category', label: 'Reference', items: ['reference/cli', 'reference/extension-api', 'reference/release-notes-1.3.0', 'reference/release-notes-1.2.0', 'reference/release-notes-1.1.0', 'reference/release-notes-1.0.0', 'reference/release-notes-0.26.1', 'reference/release-notes-0.26.0', 'reference/release-notes-0.25', 'reference/release-notes-0.24', 'reference/release-notes-0.23']},
  ],
};

export default sidebars;
