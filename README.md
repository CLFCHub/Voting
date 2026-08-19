# Team Voting System Skeleton

Cloudflare Pages/Workers + D1 + KV voting skeleton.

## Flow
1. User enters a 4-digit PIN.
2. Worker checks the PIN against D1 `rostered_players`.
3. If no matching rostered player exists, access is denied.
4. If matched, the worker returns that player's team and eligible teammates.
5. The user selects a teammate and submits one vote.
6. Worker records the vote in D1 and maintains a tally in KV.
7. The API prevents the same PIN from voting more than once.

## Important
- The PIN is never trusted by the browser; validation happens in the Worker.
- The browser should only receive the minimum information needed.
- Replace the example schema/data with your real roster structure.
- For production, add authentication/authorization for admin endpoints and stronger vote integrity controls.
