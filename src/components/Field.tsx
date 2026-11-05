import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  hint?: ReactNode
}

export function Field({ label, error, hint, id, ...props }: FieldProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  const description = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
  return <div className="field">
    <label htmlFor={fieldId}>{label}{props.required && <span aria-hidden="true"> *</span>}</label>
    <input {...props} id={fieldId} className={`input ${props.className ?? ''}`} aria-invalid={Boolean(error)} aria-describedby={description} />
    {error && <p className="field-error" id={`${fieldId}-error`}>{error}</p>}
    {!error && hint && <p className="field-hint" id={`${fieldId}-hint`}>{hint}</p>}
  </div>
}
