# AIRazor shared URL deployment

This package is ready to run both locally and on a hosted Python web service.

## Recommended team setup

Use one hosted service so every teammate can open the same URL. The app reads the host-provided `PORT` automatically and binds to `0.0.0.0` when deployed.

## Render deployment

1. Put this folder in a private GitHub/GitLab repository your team controls.
2. In Render, create a new Web Service from that repository, or use the included `render.yaml` Blueprint.
3. Start command: `python3 server.py`
4. Health check path: `/health`
5. Add server-side environment variables in the hosting dashboard. Do not commit secrets to Git:
   - `TAVUS_API_KEY`
   - `TAVUS_REPLICA_ID` (optional)
   - `TAVUS_PERSONA_ID` (optional)
   - `SUPABASE_URL` (once backend is wired)
   - `SUPABASE_SERVICE_ROLE_KEY` (once backend is wired)
   - `LLM_API_KEY` (once backend is wired)
6. Deploy.
7. Render will provide a team-shareable HTTPS URL.

## What this does not do yet

The current `/api/chat` endpoint is intentionally not connected to Supabase/LLM yet. The shared URL will expose the existing AIRazor UI and Tavus-ready scaffold, but the final AI brain still needs the confirmed database connection and backend logic.

## Security

Keep the repository private while internal Razorpay material is present. Never place service-role keys, LLM keys, Tavus keys, Slack tokens, or internal payment-link credentials in frontend JavaScript or committed files.
