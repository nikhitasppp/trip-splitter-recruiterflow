import { useState, type SubmitEvent } from 'react';
import { getTodayIsoDate } from '../logic/dates';
import {
  createEmptyFormValues,
  validateExpenseForm,
  type ExpenseFormErrors,
  type ExpenseFormValues,
} from '../logic/expenseForm';
import { CATEGORIES, type Member, type NewExpense } from '../types';
import { FieldError } from './FieldError';
import { SplitFields } from './SplitFields';

interface ExpenseFormProps {
  members: Member[];
  onSave: (expense: NewExpense) => void;
  onCancel: () => void;
}

export function ExpenseForm({ members, onSave, onCancel }: ExpenseFormProps) {
  const [values, setValues] = useState(() => createEmptyFormValues(members));
  const [hasTriedToSave, setHasTriedToSave] = useState(false);

  const today = getTodayIsoDate();
  // Errors are worked out from the current values on every render instead of
  // being stored, so they can't get out of date. They stay hidden until the
  // first Save, then update as the user fixes each field.
  const result = validateExpenseForm(values, members, today);
  const errors: ExpenseFormErrors = hasTriedToSave && !result.ok ? result.errors : {};

  function updateField<Field extends keyof ExpenseFormValues>(
    field: Field,
    value: ExpenseFormValues[Field],
  ) {
    setValues((previous) => ({ ...previous, [field]: value }));
  }

  function toggleEqualMember(memberId: string) {
    setValues((previous) => ({
      ...previous,
      equalMemberIds: previous.equalMemberIds.includes(memberId)
        ? previous.equalMemberIds.filter((id) => id !== memberId)
        : [...previous.equalMemberIds, memberId],
    }));
  }

  function updateExactAmount(memberId: string, text: string) {
    setValues((previous) => ({
      ...previous,
      exactAmounts: { ...previous.exactAmounts, [memberId]: text },
    }));
  }

  function updatePercentage(memberId: string, text: string) {
    setValues((previous) => ({
      ...previous,
      percentages: { ...previous.percentages, [memberId]: text },
    }));
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setHasTriedToSave(true);
    if (result.ok) {
      onSave(result.expense);
    }
  }

  // noValidate turns off the browser's own validation popups; validateExpenseForm does it instead.
  return (
    <form className="expense-form" onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="description">Description</label>
        <input
          id="description"
          type="text"
          value={values.description}
          onChange={(event) => updateField('description', event.target.value)}
          aria-invalid={errors.description !== undefined}
          aria-describedby={errors.description ? 'description-error' : undefined}
        />
        <FieldError id="description-error" message={errors.description} />
      </div>

      <div className="field">
        <label htmlFor="amount">Amount (₹)</label>
        <input
          id="amount"
          type="text"
          inputMode="decimal"
          placeholder="0.00"
          value={values.amount}
          onChange={(event) => updateField('amount', event.target.value)}
          aria-invalid={errors.amount !== undefined}
          aria-describedby={errors.amount ? 'amount-error' : undefined}
        />
        <FieldError id="amount-error" message={errors.amount} />
      </div>

      <div className="field">
        <label htmlFor="paidBy">Paid by</label>
        <select
          id="paidBy"
          value={values.paidBy}
          onChange={(event) => updateField('paidBy', event.target.value)}
          aria-invalid={errors.paidBy !== undefined}
          aria-describedby={errors.paidBy ? 'paidBy-error' : undefined}
        >
          <option value="">Choose who paid</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>
        <FieldError id="paidBy-error" message={errors.paidBy} />
      </div>

      <div className="field">
        <label htmlFor="date">Date</label>
        <input
          id="date"
          type="date"
          max={today}
          value={values.date}
          onChange={(event) => updateField('date', event.target.value)}
          aria-invalid={errors.date !== undefined}
          aria-describedby={errors.date ? 'date-error' : undefined}
        />
        <FieldError id="date-error" message={errors.date} />
      </div>

      <div className="field">
        <label htmlFor="category">Category</label>
        <select
          id="category"
          value={values.category}
          onChange={(event) => updateField('category', event.target.value)}
          aria-invalid={errors.category !== undefined}
          aria-describedby={errors.category ? 'category-error' : undefined}
        >
          <option value="">Choose a category</option>
          {CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <FieldError id="category-error" message={errors.category} />
      </div>

      <SplitFields
        members={members}
        values={values}
        errors={errors}
        onSplitTypeChange={(splitType) => updateField('splitType', splitType)}
        onToggleEqualMember={toggleEqualMember}
        onExactAmountChange={updateExactAmount}
        onPercentageChange={updatePercentage}
      />

      <div className="form-actions">
        <button type="submit" className="button button--primary">
          Save
        </button>
        {/* type="button" so Cancel can never submit the form. */}
        <button type="button" className="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
