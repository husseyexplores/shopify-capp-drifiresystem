export type Order = {
  id: string;
  name: string;
  tags: string[];
  fulfillable: boolean;
  fullyPaid: boolean;
  paymentTerms: null | PaymentTerms;
};

export type PaymentTerms = {
  id: string;
  dueInDays: number;
  overdue: boolean;
  translatedName: string;
  paymentTermsName: string; // 'Net 30' | 'Net 60' | 'Net 90'
  paymentTermsType: "RECEIPT" | "NET" | "FIXED" | "FULFILLMENT" | "UNKNOWN";
  paymentSchedules: PaymentSchedules;
};

interface PaymentSchedules {
  nodes: Node[];
}

interface Node {
  amount: Amount;
  id: string;
  dueAt: string;
  issuedAt: string;
  completedAt: string;
}

interface Amount {
  amount: string;
  currencyCode: string;
}
