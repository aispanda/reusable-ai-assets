# Static content starter

This zero-dependency starter is generated from `site-profile.json`.

## Commands

```powershell
python scripts/build_site.py
python scripts/audit_site.py . --strict
```

`dist/` is the deployable artifact. Replace provisional images in `dist/social/` through the profile/build workflow before public launch when high-quality editorial sharing art is required.

## Ownership

- `site-profile.json`: identity, routes, content, navigation, metadata, and theme.
- `src/styles.css`: shared responsive design system.
- `scripts/build_site.py`: deterministic static renderer.
- `scripts/audit_site.py`: release-oriented route and metadata audit.
- `Dockerfile`, `nginx.conf`: Cloud Run-compatible static serving.

Do not edit generated HTML in `dist/`; update the profile or source assets and rebuild.
