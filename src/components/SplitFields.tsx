import type { ExpenseFormErrors, ExpenseFormValues } from '../logic/expenseForm';
import { SPLIT_TYPE_LABELS, SPLIT_TYPES } from '../logic/splits';
import type { Member, SplitType } from '../types';
import { FieldError } from './FieldError';

const MEMBER_LEGENDS: Record<SplitType, string> = {
  equal: 'Split equally between',
  exact: 'Amount for each person (₹)',
  percent: 'Percentage for each person (%)',
};

interface SplitFieldsProps {
  members: Member[];
  values: ExpenseFormValues;
  errors: ExpenseFormErrors;
  onSplitTypeChange: (splitType: SplitType) => void;
  onToggleEqualMember: (memberId: string) => void;
  onExactAmountChange: (memberId: string, text: string) => void;
  onPercentageChange: (memberId: string, text: string) => void;
}

/** The split type choice, plus the member fields that type needs. */
export function SplitFields({
  members,
  values,
  errors,
  onSplitTypeChange,
  onToggleEqualMember,
  onExactAmountChange,
  onPercentageChange,
}: SplitFieldsProps) {
  return (
    <>
      <fieldset className="fieldset">
        <legend>Split</legend>
        <div className="choice-row">
          {SPLIT_TYPES.map((splitType) => (
            <label key={splitType} className="choice">
              <input
                type="radio"
                name="splitType"
                value={splitType}
                checked={values.splitType === splitType}
                onChange={() => onSplitTypeChange(splitType)}
              />
              {SPLIT_TYPE_LABELS[splitType]}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="fieldset" aria-describedby={errors.split ? 'split-error' : undefined}>
        <legend>{MEMBER_LEGENDS[values.splitType]}</legend>

        {values.splitType === 'equal' && (
          <MemberCheckboxes
            members={members}
            selectedIds={values.equalMemberIds}
            onToggle={onToggleEqualMember}
          />
        )}
        {values.splitType === 'exact' && (
          <MemberShareInputs
            members={members}
            idPrefix="exact"
            placeholder="0.00"
            texts={values.exactAmounts}
            errors={errors.memberShares}
            onChange={onExactAmountChange}
          />
        )}
        {values.splitType === 'percent' && (
          <MemberShareInputs
            members={members}
            idPrefix="percent"
            placeholder="0"
            texts={values.percentages}
            errors={errors.memberShares}
            onChange={onPercentageChange}
          />
        )}

        <FieldError id="split-error" message={errors.split} />
      </fieldset>
    </>
  );
}

interface MemberCheckboxesProps {
  members: Member[];
  selectedIds: string[];
  onToggle: (memberId: string) => void;
}

function MemberCheckboxes({ members, selectedIds, onToggle }: MemberCheckboxesProps) {
  return (
    <div className="choice-row">
      {members.map((member) => (
        <label key={member.id} className="choice">
          <input
            type="checkbox"
            checked={selectedIds.includes(member.id)}
            onChange={() => onToggle(member.id)}
          />
          {member.name}
        </label>
      ))}
    </div>
  );
}

interface MemberShareInputsProps {
  members: Member[];
  /** Keeps input ids unique, e.g. "exact-m1". */
  idPrefix: string;
  placeholder: string;
  texts: Record<string, string>;
  errors: Record<string, string> | undefined;
  onChange: (memberId: string, text: string) => void;
}

/** One text box per member. Used for both exact amounts and percentages. */
function MemberShareInputs({
  members,
  idPrefix,
  placeholder,
  texts,
  errors,
  onChange,
}: MemberShareInputsProps) {
  return (
    <div className="share-inputs">
      {members.map((member) => {
        const inputId = `${idPrefix}-${member.id}`;
        const error = errors?.[member.id];

        return (
          <div key={member.id} className="share-row">
            <label htmlFor={inputId}>{member.name}</label>
            <input
              id={inputId}
              type="text"
              inputMode="decimal"
              placeholder={placeholder}
              value={texts[member.id] ?? ''}
              onChange={(event) => onChange(member.id, event.target.value)}
              aria-invalid={error !== undefined}
              aria-describedby={error ? `${inputId}-error` : undefined}
            />
            <FieldError id={`${inputId}-error`} message={error} />
          </div>
        );
      })}
    </div>
  );
}
