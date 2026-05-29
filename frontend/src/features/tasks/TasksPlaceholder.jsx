import { useAuth } from '../../context/AuthContext.js';
import Button from '../../components/Button/Button.jsx';
import styles from './TasksPlaceholder.module.scss';

export default function TasksPlaceholder() {
  const { user, logout } = useAuth();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.greeting}>Hi, {user.username}</h1>
        <Button variant="secondary" onClick={logout}>
          Log out
        </Button>
      </header>
      <p className={styles.note}>Your tasks will live here (Phase 6).</p>
    </div>
  );
}
