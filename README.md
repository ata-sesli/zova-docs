# Zova documentation

Curated documentation for [Zova](https://github.com/ata-sesli/zova), built with Docusaurus and Bun.

## Develop locally

Requires Node.js 20+ and Bun.

```sh
bun install --frozen-lockfile
bun start
```

Run every local quality gate with:

```sh
bun run check
```

## Documentation releases

`docs/` always describes the current stable Zova release. There is no public unreleased version.

Before replacing current documentation for a release with changed public behavior:

1. Finish and verify the old stable documentation.
2. Snapshot it with `bun run docusaurus docs:version <old-version>`.
3. Update the `current` label in `docusaurus.config.ts` and revise `docs/` for the new release.
4. Run `bun run check` and inspect the version selector locally.
5. Publish only after the corresponding Zova release is public.

Patch releases with identical documentation do not need a separate snapshot.

## Deployment

GitHub Actions builds pull requests. Pushes to `main` additionally deploy the static artifact to GitHub Pages. Generated `build/` output is never committed.
