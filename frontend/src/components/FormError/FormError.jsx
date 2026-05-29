import styles from './FormError.module.scss';

export default function FormError({ message }) {
  if (!message) return null;
  return (
    <p className={styles.error} role="alert">
      {message}
    </p>
  );
}
