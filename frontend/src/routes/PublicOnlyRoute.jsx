import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import Spinner from '../components/Spinner/Spinner.jsx';
import styles from './RouteGate.module.scss';

export default function PublicOnlyRoute() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <div className={styles.gate}>
        <Spinner label="Restoring session" />
      </div>
    );
  }
  if (status === 'authenticated') {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}
