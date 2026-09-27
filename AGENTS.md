<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- Shared project text lives in one `workspace_state` row ('main') synced with realtime; localStorage is only an offline cache. Why: all five teammates must see the same workspace.
- Uploaded files go to the private `project-assets` bucket with metadata in `project_assets`; slides and checks read assets via `useAssets()`. Why: no base64 in state, presentation reflows from one source.
