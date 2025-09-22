// src/data/products.js
// Single source of product copy for Catalog cards and ProductDetail pages.

const PRODUCTS = [
  {
    id: "casket1",
    name: "ECO (WOODEN)",
    price: 40000,
    monthly: 3333.33,
    short: "Affordable solid-pine casket with a natural finish — simple, durable, respectful.",
    fullDescription:
      "Eco is a solid pine casket designed for families seeking a dignified farewell at a modest cost. Built with sturdy joinery and a natural, unvarnished finish, it offers a straightforward, warm presentation for services. The interior is lined with soft cotton and a supportive pillow for viewing. Eco prioritizes durability and respectful simplicity while maintaining functional, long-lasting construction.",
    insuranceDetails:
      "Basic Funeral Assistance Plan included. This policy helps with administrative and immediate funeral arrangement costs and provides a simplified claims process for accidental death. It offers modest financial support intended for short-term needs and does not replace a full life insurance policy. Claims require standard documentation and are processed under policy terms and exclusions.",
    includedItems: [
      "Solid-pine casket (natural finish)",
      "Interior cotton lining & pillow",
      "Basic preparation and handling",
      "2-day standard chapel use",
      "Documentation & permit assistance"
    ]
  },

  {
    id: "casket2",
    name: "ABRAM (CLASSIC)",
    price: 74999,
    monthly: 6249.91,
    short: "Polished, traditional wood-style casket with refined trim and satin interior.",
    fullDescription:
      "Abram combines classic styling with a polished finish to create a warm, traditional presence at services. The casket features elegant trim and a satin-lined interior for a refined appearance during viewings. Designed to be a timeless choice, Abram offers dependable construction and detailed finishing that looks dignified in formal ceremonies.",
    insuranceDetails:
      "Standard Funeral Priority Plan included. This plan provides reimbursement assistance for selected funeral fees, expedited claims handling, and access to dedicated support for paperwork and coordination. It includes a small accidental death benefit and helps families manage immediate costs with priority customer service during the claims process.",
    includedItems: [
      "Polished wood-style casket with decorative trim",
      "Luxury satin interior & tailored pillow",
      "Full preparation and dressing",
      "3-day chapel use and basic transfers",
      "Priority claims assistance & coordination"
    ]
  },

  {
    id: "casket3",
    name: "BETA (CLASSIC)",
    price: 70000,
    monthly: 5833.33,
    short: "Robust oak-style casket with durable finish — balanced quality and value.",
    fullDescription:
      "Beta is a mid-range oak-style casket built for families who want solid presence without premium pricing. The durable finish stands up to transport and handling while maintaining a respectful, traditional look. Inside, Beta offers a comfortable lining and neat finishing touches for viewing and ceremony.",
    insuranceDetails:
      "Funeral Support Plan included. The plan covers administrative costs and provides guided claims assistance with partner insurers. It helps simplify the paperwork involved in filing claims and offers limited reimbursement assistance for qualifying funeral expenses. Standard policy exclusions apply.",
    includedItems: [
      "Oak-style casket with durable finish",
      "Comfort interior lining & pillow",
      "Preparation and basic embalming",
      "Standard chapel booking",
      "Documentation & coordination support"
    ]
  },

  {
    id: "casket4",
    name: "SKY (MODERN)",
    price: 99999,
    monthly: 8333.25,
    short: "Contemporary metallic casket with clean lines and premium interior.",
    fullDescription:
      "Sky is a modern-design casket with a sleek metallic exterior and a refined, understated interior. It is crafted for families who prefer a contemporary presentation. Sky’s construction emphasizes smooth surfaces and precise detailing, while the interior offers high-quality fabric and cushioning suitable for VIP-style services and modern memorials.",
    insuranceDetails:
      "Premium Funeral Coverage included. This policy offers higher reimbursement limits for service-related fees, priority claims handling, and a dedicated claims coordinator to help expedite payouts. The plan can provide short-term financial assistance for urgent expenses and smoother administrative support for families during the immediate aftermath.",
    includedItems: [
      "Modern metallic casket with premium lining",
      "High-quality interior fabric & pillow",
      "Full preparation, dressing & embalming",
      "VIP chapel support and transfer services",
      "Dedicated insurance claims coordinator"
    ]
  },

  {
    id: "casket5",
    name: "CLOUD (MODERN)",
    price: 99999,
    monthly: 8333.25,
    short: "Premium white-finish casket for a clean, serene presentation.",
    fullDescription:
      "Cloud is a premium white casket designed to convey calm and dignity. The smooth, high-quality finish and plush interior create a peaceful presentation appropriate for elegant memorials. Cloud is crafted for families wanting a light, graceful aesthetic and superior finishing at a premium level.",
    insuranceDetails:
      "Comprehensive Funeral Plan included. This policy provides extensive claims support, higher payout limits for qualifying costs, and priority assistance from a dedicated claims agent. The plan helps families with a broad range of funeral expenses and facilitates faster processing for approved claims; specific terms and exclusions apply.",
    includedItems: [
      "Premium white-finish casket",
      "Plush interior lining & pillow",
      "Complete preparation & embalming",
      "Extended chapel time and VIP options",
      "Full insurance claims & coordination support"
    ]
  }
];

export default PRODUCTS;
