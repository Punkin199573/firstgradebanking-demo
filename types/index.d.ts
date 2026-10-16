declare type SearchParamProps = {
  params: { [key: string]: string };
  searchParams: { [key: string]: string | string[] | undefined };
};

declare type User = {
  $id: string;
  id: string;
  email: string;
  userId: string;
  name: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin";
};

declare type Account = {
  id: string;
  availableBalance: number;
  currentBalance: number;
  officialName: string;
  mask: string;
  institutionId: string;
  name: string;
  type: string;
  subtype: string;
  accountNumber: string;
  routingNumber: string;
};

declare type Transaction = {
  id: string;
  name: string;
  paymentChannel: string;
  type: string;
  accountId: string;
  amount: number;
  pending: boolean;
  status: "pending" | "successful" | "on_hold" | "action_required" | "failed";
  customerNotice: string;
  category: string;
  date: string;
};

declare type AccountTypes =
  | "depository"
  | "credit"
  | "loan "
  | "investment"
  | "other";

declare type CategoryCount = {
  name: string;
  count: number;
  totalCount: number;
};

declare interface CreditCardProps {
  account: Account;
  userName: string;
}

declare interface BankInfoProps {
  account: Account;
  selectedAccountId?: string;
  type: "full" | "card";
}

declare interface HeaderBoxProps {
  type?: "title" | "greeting";
  title: string;
  subtext: string;
  user?: string;
}

declare interface MobileNavProps {
  user: User;
}

declare interface AuthFormProps {
  type: "sign-in" | "sign-up";
}

declare interface BankTabItemProps {
  account: Account;
  selectedAccountId?: string;
}

declare interface TotlaBalanceBoxProps {
  accounts: Account[];
  totalBanks: number;
  totalCurrentBalance: number;
}

declare interface FooterProps {
  user: User;
  type?: "mobile" | "desktop";
}

declare interface RightSidebarProps {
  user: User;
  transactions: Transaction[];
  banks: Account[];
}

declare interface SiderbarProps {
  user: User;
}

declare interface RecentTransactionsProps {
  accounts: Account[];
  transactionsByAccount: Record<string, Transaction[]>;
  selectedAccountId: string;
}

declare interface CategoryBadgeProps {
  category: string;
}

declare interface TransactionTableProps {
  transactions: Transaction[];
}

declare interface CategoryProps {
  category: CategoryCount;
}

declare interface DoughnutChartProps {
  accounts: Account[];
}

declare interface PaymentTransferFormProps {
  accounts: Account[];
}

declare interface getAccountsProps {
  userId: string;
}

declare interface getAccountProps {
  accountId: string;
}

declare interface signInProps {
  email: string;
  password: string;
}
