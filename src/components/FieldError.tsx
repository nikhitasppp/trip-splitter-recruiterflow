interface FieldErrorProps {
  /** The field points at this id with aria-describedby, so screen readers read the error too. */
  id: string;
  message: string | undefined;
}

/** An error message shown right below its field. Renders nothing when there's no error. */
export function FieldError({ id, message }: FieldErrorProps) {
  if (message === undefined) return null;

  return (
    <p id={id} className="field-error">
      {message}
    </p>
  );
}
