# Code review notes

Changes included:
- Collapsed photo capture/gallery into one native mobile file chooser.
- Removed an unused `useRef` import from the player page.
- Added automatic player-state refresh on focus, visibility return, and every 20 seconds so Admin mission edits appear without waiting for a manual reload.
- Added database migration v7 for Mission 6 wording (paper or iPad).
- Converted Sunday 18:00 content into a first-class Special Mission with a countdown, two games, and a protected special clue.
- The special clue is not returned in the player API until both games are complete.
- Added Special Mission to the Admin mission plan and added a Player View preview.
- Added an editable special clue in Admin.

Review observations:
- Mission content is database-driven. Admin edits already update the same `hunt_missions` table read by players; the previous apparent mismatch was primarily because the player page did not refresh state automatically.
- Old content-version migrations are still intentionally retained because existing VPS databases may need them. They are not dead code and should not be deleted until all deployed databases are known to be migrated.
- `photo_prompt` remains in the schema even though current photo review is manual. It is retained for compatibility and possible future automated review; it is not exposed to players.
