import styles from './TextInput.module.scss';

export default function TextInput({
  id,
  label,
  type = 'text',
  value,
  onChange,
  name,
  autoComplete,
  required = false,
  disabled = false,
}) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        className={styles.input}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
