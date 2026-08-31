/**
 * The deduction categories the app recognises.
 *
 * Lives here rather than in the route file because a Next.js route module may
 * only export route handlers and a fixed set of config fields — exporting a
 * constant from one fails the BUILD with "not a valid Route export field",
 * which neither `tsc --noEmit` nor jest can see. Two sibling routes import
 * this, so it needs a home outside the route tree regardless.
 *
 * The ids mirror IRS Schedule A lines and are stored verbatim in
 * tax_deductions.category, so renaming one is a data migration.
 */

/** Deduction categories the app recognises, with their IRS framing. */
export const DEDUCTION_CATEGORIES = [
  { id: "charitable", name: "Charitable donations", description: "Cash and non-cash gifts to qualified organisations", icon: "heart" },
  { id: "medical", name: "Medical & dental", description: "Unreimbursed expenses above the AGI threshold", icon: "medical-bag" },
  { id: "mortgage_interest", name: "Mortgage interest", description: "Interest reported on Form 1098", icon: "home" },
  { id: "state_local_tax", name: "State & local taxes", description: "Income, sales and property tax, capped by SALT", icon: "bank" },
  { id: "student_loan_interest", name: "Student loan interest", description: "Interest reported on Form 1098-E", icon: "school" },
  { id: "business_expense", name: "Business expenses", description: "Ordinary and necessary self-employment costs", icon: "briefcase" },
  { id: "home_office", name: "Home office", description: "Portion of the home used regularly and exclusively for work", icon: "desk" },
  { id: "education", name: "Education", description: "Tuition and fees reported on Form 1098-T", icon: "book" },
  { id: "retirement", name: "Retirement contributions", description: "Deductible traditional IRA and self-employed plan contributions", icon: "piggy-bank" },
  { id: "other", name: "Other", description: "Anything not covered above", icon: "dots-horizontal" },
] as const;
