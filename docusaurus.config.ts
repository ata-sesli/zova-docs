import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Zova',
  tagline: 'SQLite-backed records, objects, vectors, and graphs',
  favicon: 'img/zova-logo.png',
  future: {v4: true},
  url: 'https://ata-sesli.github.io',
  baseUrl: '/zova-docs/',
  organizationName: 'ata-sesli',
  projectName: 'zova-docs',
  trailingSlash: true,
  onBrokenLinks: 'throw',
  markdown: {mermaid: true, hooks: {onBrokenMarkdownLinks: 'throw'}},
  themes: ['@docusaurus/theme-mermaid'],
  i18n: {defaultLocale: 'en', locales: ['en']},
  presets: [[
    'classic',
    {
      docs: {
        sidebarPath: './sidebars.ts',
        routeBasePath: 'docs',
        lastVersion: 'current',
        versions: {
          current: {label: 'v1.3.0', path: ''},
          '1.1.0': {label: 'v1.1.0'},
          '0.26.1': {label: 'v0.26.1'},
          '0.24.0': {label: 'v0.24.0'},
          '0.23.0': {label: 'v0.23.0'},
        },
        editUrl: 'https://github.com/ata-sesli/zova-docs/edit/main/',
      },
      blog: false,
      theme: {customCss: './src/css/custom.css'},
    } satisfies Preset.Options,
  ]],
  themeConfig: {
    metadata: [
      {name: 'description', content: 'Documentation for the Zova embedded database.'},
      {name: 'theme-color', content: '#6f9f91'},
    ],
    image: 'img/zova-logo.png',
    colorMode: {respectPrefersColorScheme: true},
    navbar: {
      title: 'Zova',
      logo: {alt: 'Zova feather logo', src: 'img/zova-logo.png'},
      items: [
        {type: 'docSidebar', sidebarId: 'docsSidebar', label: 'Docs', position: 'left'},
        {to: '/docs/reference/release-notes-1.3.0', label: 'Release notes', position: 'left'},
        {type: 'docsVersionDropdown', position: 'right'},
        {
          href: 'https://github.com/ata-sesli/zova',
          position: 'right',
          className: 'header-github-link',
          'aria-label': 'GitHub repository',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {title: 'Learn', items: [{label: 'Get started', to: '/docs/intro'}, {label: 'Install', to: '/docs/get-started/installation'}]},
        {title: 'Reference', items: [{label: 'CLI', to: '/docs/reference/cli'}, {label: 'Extensions', to: '/docs/reference/extension-api'}]},
        {title: 'Project', items: [{label: 'Source', href: 'https://github.com/ata-sesli/zova'}, {label: 'Releases', href: 'https://github.com/ata-sesli/zova/releases'}]},
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Zova contributors.`,
    },
    prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
  } satisfies Preset.ThemeConfig,
};

export default config;
