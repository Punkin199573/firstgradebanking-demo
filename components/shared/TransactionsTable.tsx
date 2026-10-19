import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { transactionCategoryStyles } from "@/constants";
import { MessageCircle } from "lucide-react";
import {
  cn,
  formatAmount,
  formatDateTime,
  removeSpecialCharacters,
} from "@/lib/utils";

const CategoryBadge = ({ category }: CategoryBadgeProps) => {
  const { borderColor, backgroundColor, textColor, chipBackgroundColor } =
    transactionCategoryStyles[
      category as keyof typeof transactionCategoryStyles
    ] || transactionCategoryStyles.default;

  return (
    <div className={cn("category-badge", borderColor, chipBackgroundColor)}>
      <div className={cn("size-2 rounded-full", backgroundColor)} />
      <p className={cn("text-[12px] font-medium", textColor)}>{category}</p>
    </div>
  );
};

const openSupportChat = () => {
  const tawk = (window as Window & { Tawk_API?: { maximize?: () => void } }).Tawk_API;
  tawk?.maximize?.();
};

const TransactionsTable = ({ transactions }: TransactionTableProps) => {
  return (
    <div className="transactions-table-scroll">
      <Table>
        <TableHeader className="bg-[#f9fafb]">
          <TableRow>
            <TableHead className="px-2">Transaction</TableHead>
            <TableHead className="px-2">Amount</TableHead>
            <TableHead className="px-2">Status</TableHead>
            <TableHead className="px-2">Date</TableHead>
            <TableHead className="px-2 max-md:hidden">Channel</TableHead>
            <TableHead className="px-2 max-md:hidden">Category</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {transactions.map((t: Transaction) => {
            const statusLabels: Record<Transaction["status"], string> = {
              pending: "Pending",
              successful: "Successful",
              on_hold: "On hold",
              action_required: "Action required",
              failed: "Failed",
            };
            const amount = formatAmount(t.amount);

            const isDebit = t.type === "debit";
            const channel = t.paymentChannel
              .replace(/^simulated_/, "")
              .replaceAll("_", " ")
              .toUpperCase();

            return (
              <TableRow
                key={t.id}
                className={`${
                  isDebit ? "bg-[#FFFBFA]" : "bg-[#F6FEF9]"
                } !over:bg-none !border-b-DEFAULT`}
              >
                <TableCell className="max-w-[250px] pl-2 pr-4 sm:pr-10">
                  <div className="flex items-center gap-3">
                    <span className="text-14 font-semibold text-[#344054]">
                      {removeSpecialCharacters(t.name)}
                    </span>
                  </div>
                  {(t.customerNotice || t.status !== "successful") && (
                    <div className="mt-2 flex max-w-[280px] flex-col items-start gap-2">
                      {t.customerNotice && (
                        <p className="whitespace-normal text-12 text-gray-500">
                          {t.customerNotice}
                        </p>
                      )}
                      {t.status !== "successful" && (
                        <button
                          type="button"
                          onClick={openSupportChat}
                          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-12 font-semibold text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                        >
                          <MessageCircle aria-hidden="true" className="size-4" />
                          Contact support
                        </button>
                      )}
                    </div>
                  )}
                </TableCell>

                <TableCell
                  className={`whitespace-nowrap pl-2 pr-4 font-semibold sm:pr-10 ${
                    isDebit ? "text-[#f04438]" : "text-[#039855]"
                  }`}
                >
                  {isDebit ? `-${amount}` : amount}
                </TableCell>

                <TableCell className="pl-2 pr-4 sm:pr-10">
                  <CategoryBadge category={statusLabels[t.status]} />
                </TableCell>

                <TableCell className="min-w-28 whitespace-nowrap pl-2 pr-4 sm:pr-10">
                  {formatDateTime(new Date(t.date)).dateTime}
                </TableCell>

                <TableCell className="min-w-24 pl-2 pr-4 capitalize sm:pr-10">
                  {channel}
                </TableCell>

                <TableCell className="pl-2 pr-4 sm:pr-10 max-md:hidden">
                  <CategoryBadge category={t.category} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};

export default TransactionsTable;
