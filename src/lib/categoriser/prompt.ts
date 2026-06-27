import { CATEGORY_KEYS } from "../categories";

/** Single source of truth for the categoriser prompt — shown on the eval page. */
export const CATEGORISER_SYSTEM = `You categorise German bank statement transactions for a lending affordability check.
Use the description, the signed amount (negative = money out), and the apparent monthly cadence.
Return strictly one object per input transaction, matched by index.
Never invent categories — use only the allowed set. Prefer "transfer" for internal money movement
that is neither income nor an obligation. Mark isIncome only for genuine inflows the applicant earns,
isObligation only for credit commitments (loan, BNPL, other credit, rent), isRecurring for anything
that repeats monthly. Keep confidence honest: lower it for ambiguous lines.
Allowed categories: ${CATEGORY_KEYS.join(", ")}.`;

export const CATEGORISER_FEWSHOT = `Examples:
- "Lohn/Gehalt Muster GmbH", +3200, monthly -> salary, isIncome true, isRecurring true, confidence 0.97
- "Miete Wohnung", -950, monthly -> rent, isObligation true, isRecurring true, confidence 0.95
- "RatenFlex Rate", -180, monthly -> bnpl, isObligation true, isRecurring true, confidence 0.9
- "Markthalle Kartenzahlung", -47, irregular -> groceries, confidence 0.85
- "Übertrag eigenes Sparkonto", -250 -> transfer, confidence 0.8
- "LuckySpin Einzahlung", -40 -> gambling, confidence 0.92`;

export const CATEGORISER_SCHEMA_TS = `z.object({
  category: z.enum([ ${CATEGORY_KEYS.map((c) => `"${c}"`).join(", ")} ]),
  subcategory: z.string(),
  confidence: z.number().min(0).max(1),
  isIncome: z.boolean(),
  isRecurring: z.boolean(),
  isObligation: z.boolean(),
})`;
