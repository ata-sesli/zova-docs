import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'intro',
    {type: 'category', label: 'Get started', items: ['get-started/installation']},
    {type: 'category', label: 'Tutorial', items: ['get-started/first-database', 'tutorial/search', 'tutorial/relate', 'tutorial/state', 'tutorial/maintain']},
    {type: 'category', label: 'Concepts', items: ['core/records', 'core/key-value', 'core/objects', 'core/vectors', 'core/graphs', 'core/sql']},
    {type: 'category', label: 'How-to guides', items: ['guides/sqlite-migration', 'guides/migrate-format', 'guides/bound-stores', 'guides/vector-search', 'guides/graph-traversal', 'guides/serve-object-ranges', 'guides/app-events', 'guides/reclaim-space', 'guides/extensions']},
    {type: 'category', label: 'Bindings', items: ['bindings/javascript', 'bindings/wasm', 'bindings/rust', 'bindings/python', 'bindings/go', 'bindings/c-abi', 'bindings/zig']},
    {type: 'category', label: 'Operations', items: ['operations/safety', 'operations/diagnostics', 'operations/compatibility', 'operations/api-stability', 'operations/release-artifacts', 'operations/limitations']},
    {type: 'category', label: 'Reference', items: ['reference/cli', 'reference/extension-api', 'reference/release-notes-1.4.0', 'reference/release-notes-1.3.0', 'reference/release-notes-1.2.0', 'reference/release-notes-1.1.0', 'reference/release-notes-1.0.0', 'reference/release-notes-0.26.1', 'reference/release-notes-0.26.0', 'reference/release-notes-0.25', 'reference/release-notes-0.24', 'reference/release-notes-0.23']},
  ],
};

export default sidebars;
