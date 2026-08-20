# AIRazor RAG regression test pack

Use these prompts in Control Room → Live AIRazor brain test after every knowledge or prompt change. The test is successful only if AIRazor stays grounded, preserves context and does not invent commercials.

## 1. Broad Payroll discovery
**Prompt:** `We are 80 employees and payroll is still largely manual. What can Razorpay help me with?`

Expected behavior:
- Detect Payroll as the primary area.
- Explain verified capability areas: payroll processing, attendance/leave, employee lifecycle, supported compliance operations, reporting/HR workflows.
- Ask one focused qualifier about current setup or biggest pain point.
- Do not invent pricing.

## 2. Attendance-led Payroll fit
**Prompt:** `We have 120 employees. Attendance comes from spreadsheets and every payroll cycle HR spends hours reconciling leave before salaries. What should I look at?`

Expected behavior:
- Capture 120 employees.
- Lead with Payroll attendance/leave sync and salary calculation relevance.
- Ask whether attendance will come from Payroll, biometric devices or another HRMS/integration.
- If plan band is discussed, 120 employees maps to the documented Elite band; no price should be invented.

## 3. Full-and-final settlement
**Prompt:** `We process many employee exits and full-and-final settlement is painful. Can Payroll help?`

Expected behavior:
- Explain that the verified HR workflow covers employee exit management including F&F.
- Ask where the bottleneck is: calculation, approvals, settlement tracking or closure.
- Offer a focused F&F demo rather than a generic tour.

## 4. Compliance operations
**Prompt:** `Can Razorpay Payroll take care of PF, TDS, PT and ESIC for us?`

Expected behavior:
- Explain supported operational calculations/payments/filings from verified context.
- Avoid claiming every organisation-level statutory registration is automatically handled.
- Ask which compliance operation is manual today if more detail is needed.

## 5. Payroll plan band without price invention
**Prompt:** `We have 500 employees. Which Payroll plan should I consider and what does it cost?`

Expected behavior:
- 500 employees maps to the documented Elite employee band.
- Pricing must not be invented unless approved pricing appears in Supabase retrieval.
- Explicitly say the latest commercial needs verification if pricing is absent.

## 6. Multi-intent merchant
**Prompt:** `We have 200 employees, need payroll automation, and also want to accept payments from customers on our website.`

Expected behavior:
- Preserve both Payroll and payment collection requirements.
- Do not collapse them into one product.
- Ask which journey the merchant wants to solve first or explicitly sequence them.

## 7. Vendor payouts versus Payroll
**Prompt:** `I need to pay 300 vendors every month and also run salaries for 60 employees.`

Expected behavior:
- Preserve vendor payouts and Payroll separately.
- Capture both scales if possible.
- Do not recommend Payroll as the vendor payout solution.

## 8. Existing HRMS
**Prompt:** `We already use an HRMS but payroll and compliance work is fragmented. Do we need to replace the HRMS?`

Expected behavior:
- Mention verified HRMS integration capability without promising compatibility with an unspecified vendor.
- Ask which HRMS is used and what data/process needs to remain there.

## 9. Merchant asks for recap
**Prompt:** `What did you understand from everything I told you?`

Expected behavior:
- Recap captured requirements and pain points.
- Do not continue pitching or introduce a new product.

## 10. Unknown commercial
**Prompt:** `Give me the exact Payroll price for 120 employees and a payment link now.`

Expected behavior:
- Never invent an exact price or payment link.
- State that the current approved commercial/action source must be checked.
- Continue with the next valid qualification or approved action.

## Demo-quality Payroll path
Recommended recorded flow:
1. `We have 120 employees. Payroll is manual, attendance reconciliation takes too long, and full-and-final settlement is painful.`
2. Answer AIRazor's qualifier with the current setup, for example: `We use spreadsheets for attendance and run payroll manually.`
3. Confirm AIRazor leads with Attendance and F&F rather than a generic walkthrough.
4. Open the personalised Payroll demo from the merchant frontend.
5. Switch to another need such as Payment Gateway and verify AIRazor preserves Payroll context.
