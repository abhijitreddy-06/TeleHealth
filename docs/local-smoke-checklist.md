# Local Smoke Checklist

Use this checklist after starting both apps in local mode.

## Start Sequence

1. Terminal 1 (backend, root):

```bash
npm run local:backend
```

2. Terminal 2 (frontend):

```bash
cd telehealth-frontend
npm run local:dev
```

If startup fails due to ports:

```bash
npm run local:free-ports
```

Then retry both terminals.

## Smoke Checklist

1. Login works:
- Open `http://localhost:3000`.
- Complete login with a valid patient or doctor account.
- Confirm redirect to the expected dashboard page.

2. Session refresh works:
- Stay logged in, then refresh the browser page.
- Confirm user remains authenticated.
- Optional API check: open devtools network and verify `GET /api/auth/session` returns authenticated state.

3. Core dashboard loads:
- Open the primary dashboard route for the logged-in role.
- Confirm summary cards, navigation, and at least one protected API request succeed.

4. One appointment flow works:
- Create/book one appointment (or use an existing upcoming one).
- Confirm it appears in dashboard/history.
- If video flow is available locally, open the appointment join path and verify page loads.

5. One file upload/download works:
- Upload one file through records/vault flow.
- Download the same file.
- Confirm file content is intact.

## Repeatability Record

Run the checklist at least 3 consecutive restart cycles:

| Cycle | Backend Boot | Frontend Boot | Smoke Pass | Notes |
|---|---|---|---|---|
| 1 | Pass/Fail | Pass/Fail | Pass/Fail | |
| 2 | Pass/Fail | Pass/Fail | Pass/Fail | |
| 3 | Pass/Fail | Pass/Fail | Pass/Fail | |

## Done Criteria

- Both apps can be restarted any time and come up cleanly.
- The smoke checklist passes repeatedly across restart cycles.
