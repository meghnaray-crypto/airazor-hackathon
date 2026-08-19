window.AIRAZOR_DATA = {
  plans: [
    {
      id: "advanced",
      name: "I2P / Advanced",
      price: "₹14,999 + GST",
      billing: "Monthly SaaS fee; charged quarterly",
      features: [
        "API integration",
        "Invoice payment",
        "OCR management",
        "Vendor onboarding",
        "Accounting integrations",
        "Custom reports and bank validation"
      ]
    },
    {
      id: "pro_api",
      name: "Pro + API",
      price: "₹9,999 + GST",
      billing: "Monthly SaaS fee; charged quarterly",
      features: [
        "API integration",
        "Bulk and multichannel payouts",
        "Maker-checker",
        "Workflow-based payouts",
        "Real-time payout tracking"
      ]
    },
    {
      id: "pro",
      name: "Pro",
      price: "₹5,999 + GST",
      billing: "Monthly SaaS fee; charged quarterly",
      features: [
        "Bulk and multichannel payouts",
        "Maker-checker",
        "Workflow-based payouts",
        "Payout links",
        "Real-time payout tracking"
      ]
    },
    {
      id: "core",
      name: "Core",
      price: "₹1,999 + GST",
      billing: "Monthly SaaS fee; charged quarterly",
      features: [
        "Instant beneficiary addition",
        "Instant payout",
        "Mobile banking",
        "Real-time payout tracking",
        "Multichannel payouts"
      ]
    }
  ],

  transactionPricing: [
    ["IMPS below ₹1,000", "₹3.00"],
    ["IMPS ₹1,000–₹25,000", "₹4.00"],
    ["IMPS above ₹25,000", "₹8.00"],
    ["UPI below ₹1,000", "₹4.00"],
    ["UPI ₹1,000–₹25,000", "₹5.00"],
    ["UPI above ₹25,000", "₹9.00"],
    ["NEFT", "₹3.00"],
    ["RTGS", "₹4.50"]
  ],

  checklists: {
    currentAccount: [
      "Legal name",
      "Business name",
      "Entity type",
      "Primary contact name",
      "Phone number",
      "Alternate phone number",
      "Email address",
      "Registered address",
      "Operational address",
      "Google Maps location",
      "Annual turnover",
      "PAN",
      "CIN, where applicable",
      "GST number and address, where applicable",
      "Website, if any",
      "Detailed business model",
      "Line of business",
      "Proof of business document",
      "Office or home setup photos with nameboard"
    ],
    vendorPayouts: [
      "Legal and business name",
      "Entity type",
      "Primary contact details",
      "Registered and operational address",
      "PAN, CIN and GST, where applicable",
      "Detailed business model",
      "Line of business",
      "Recipient type and vendor relationship",
      "Expected vendor count",
      "Expected payout volume and frequency",
      "Current payout process",
      "Proof of business document",
      "Office or home setup photos with nameboard",
      "Selected RazorpayX plan"
    ],
    escrow: [
      "Legal and business name",
      "Entity type",
      "Primary contact details",
      "Registered and operational address",
      "PAN, CIN and GST, where applicable",
      "Detailed marketplace model and funds flow",
      "Vendor or service-provider agreements",
      "Customer tax-invoice sample",
      "Confirmation that the app or platform is live",
      "Confirmation that Payment Gateway is integrated",
      "Expected transaction and settlement volume",
      "Escrow release condition",
      "Proof of business document",
      "Selected RazorpayX plan"
    ],
    paymentGateway: [
      "Legal and business name",
      "Entity type",
      "Primary contact details",
      "Website or application URL",
      "Business model",
      "Expected monthly payment volume",
      "Payment methods required",
      "PAN, CIN and GST, where applicable"
    ]
  }
};
