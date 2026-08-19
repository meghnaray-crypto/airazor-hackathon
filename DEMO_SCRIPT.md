# AIRazor Hackathon Demo Script

## Primary merchant story

Merchant says:

> We have around 120 employees. Payroll is still manual and attendance inputs and full-and-final settlement are painful.

Expected AIRazor behavior:

1. Detect Payroll.
2. Capture employee count = 120.
3. Capture pain points = attendance + F&F.
4. Ask only the minimum useful qualification question.
5. Personalize the demo around Attendance and F&F rather than starting a generic tour.

## Interruption during demo

Merchant says:

> What about employees leaving the organization?

Expected AIRazor behavior:

- Preserve prior Payroll context.
- Shift the demo focus to F&F / employee exit.
- Do not restart discovery.

## Multi-intent memory test

Merchant says:

> Leave payroll for a second. I also want to improve checkout on our website.

Expected AIRazor behavior:

- Preserve Payroll as an existing need.
- Detect checkout optimization as a second need.
- Summarize both needs.
- Ask which one to prioritize.
- Never silently replace the Payroll requirement.

## Magic Checkout specialist path

If Magic Checkout is identified and specialist support is required:

1. Capture minimum merchant context.
2. Return a structured specialist handoff.
3. Send the handoff to the configured Slack route.
4. Show the approved follow-up expectation only after the team confirms the SLA.

## Closing summary

AIRazor should end with a compact summary containing:

- Merchant needs
- Captured pain points
- Recommended product / current status
- Demo modules shown
- Open secondary needs
- Next action
- Whether human escalation is required

## Judge-breaking test

Merchant says:

> Did you actually understand my full requirement?

Expected AIRazor behavior:

- Stop pitching.
- Recap every known requirement.
- Separate confirmed facts from missing facts.
- Ask for confirmation before moving forward.
