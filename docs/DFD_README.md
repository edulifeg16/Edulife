DFD files (Mermaid)

Files:
- `dfd-level0.mmd` : Context-level (Level 0) DFD for the Edulife system
- `dfd-level1.mmd` : Major processes (Level 1)
- `dfd-level2.mmd` : Detailed internal flow of the Cognitive Content Generator (Level 2)

How to view

1) Install Mermaid CLI (optional) if you want SVGs:

```powershell
npm install -g @mermaid-js/mermaid-cli
```

2) Render a Mermaid file to SVG/PDF/PNG:

```powershell
mmdc -i docs\dfd-level0.mmd -o docs\dfd-level0.svg
mmdc -i docs\dfd-level1.mmd -o docs\dfd-level1.svg
mmdc -i docs\dfd-level2.mmd -o docs\dfd-level2.svg
```

3) Or open the `.mmd` files in an editor/IDE with Mermaid preview (e.g. VS Code with Mermaid preview extension).

If you want, I can also generate SVG/PNG exports and add them to `docs/`. Tell me which sizes or whether you'd like them committed to git.