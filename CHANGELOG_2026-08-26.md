# Senior Code Hunt - 2026-08-26

- Removed direct senior-name references from player UI, admin branding, API messages, and setup docs.
- Replaced name/initial-revealing mission 8 and 9 content with name-safe alternatives.
- Added database content version 6 so existing deployments update mission 8/9 automatically.
- Admin player cards now scroll horizontally when the list is wider than the screen.
- Memory mini-game: after passing a stage, the action is now "ด่านต่อไป". Wrong input shows "ผิด" for 3 seconds, then replays the same stage.
- 4-digit code mini-game now shows per-digit feedback: blue = exact position, orange = digit exists in another position, dark = digit absent.
- Player-side code secret is no longer generated/stored in the browser. The real secret is held in a signed HttpOnly server cookie and guesses are checked by the API.
- Admin test mode remains local and does not affect real player progress.
