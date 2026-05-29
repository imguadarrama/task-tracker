import Spinner from '../Spinner/Spinner.jsx';
import styles from './Button.module.scss';

export default function Button({
  type = 'button',
  variant = 'primary',
  disabled = false,
  loading = false,
  onClick,
  children,
}) {
  return (
    <button
      type={type}
      className={`${styles.button} ${styles[variant]}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
