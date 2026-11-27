import { useState } from 'react';
import { describeBalance, getBalanceStatus } from '../logic/balances';
import { describePayment, paymentsFor, type Payment } from '../logic/settlements';
import type { Member, Paise } from '../types';

interface BalanceListProps {
  members: Member[];
  /** Balance in paise for each member id. */
  balances: Record<string, Paise>;
  /** Suggested payments that settle the balances, from suggestSettlements. */
  payments: Payment[];
}

export function BalanceList({ members, balances, payments }: BalanceListProps) {
  // Only one card is open at a time, so one id is enough. null means all closed.
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  function toggleCard(memberId: string) {
    setExpandedMemberId((current) => (current === memberId ? null : memberId));
  }

  return (
    <ul className="balance-list">
      {members.map((member) => {
        const balance = balances[member.id] ?? 0;
        const isExpanded = expandedMemberId === member.id;
        const detailsId = `balance-details-${member.id}`;

        // The words ("owes ₹X") carry the meaning; the colour from the class is extra.
        return (
          <li key={member.id} className={`balance balance--${getBalanceStatus(balance)}`}>
            <button
              type="button"
              className="balance__toggle"
              aria-expanded={isExpanded}
              aria-controls={isExpanded ? detailsId : undefined}
              onClick={() => toggleCard(member.id)}
            >
              <span className="balance__name">{member.name}</span>{' '}
              <span className="balance__text">{describeBalance(balance)}</span>
              <span className="balance__chevron" aria-hidden="true" />
            </button>

            {isExpanded && (
              <SuggestedPayments
                id={detailsId}
                memberId={member.id}
                members={members}
                payments={paymentsFor(payments, member.id)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

interface SuggestedPaymentsProps {
  id: string;
  memberId: string;
  members: Member[];
  /** Only this member's payments. */
  payments: Payment[];
}

/** The open part of a card: who this member should pay, or receive money from. */
function SuggestedPayments({ id, memberId, members, payments }: SuggestedPaymentsProps) {
  if (payments.length === 0) {
    return (
      <div id={id} className="balance__details">
        <p>No payments needed</p>
      </div>
    );
  }

  return (
    <div id={id} className="balance__details">
      <p className="balance__details-title">Suggested payments</p>
      <ul>
        {payments.map((payment) => (
          <li key={`${payment.from}-${payment.to}`}>{describePayment(payment, memberId, members)}</li>
        ))}
      </ul>
      {/* Stops people adding up the Expense breakdown shares on top of these payments. */}
      <p className="balance__note">
        These suggested payments settle your overall trip balances. Individual expense shares are
        already included.
      </p>
    </div>
  );
}
