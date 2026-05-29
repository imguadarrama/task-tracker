import { Link } from 'react-router-dom';
import Card from '../../components/Card/Card.jsx';
import AuthForm from './AuthForm.jsx';
import styles from './AuthPage.module.scss';

const COPY = {
  login: {
    title: 'Welcome back',
    prompt: 'Need an account?',
    linkLabel: 'Create one',
    linkTo: '/register',
  },
  register: {
    title: 'Create your account',
    prompt: 'Already registered?',
    linkLabel: 'Log in',
    linkTo: '/login',
  },
};

export default function AuthPage({ mode }) {
  const copy = COPY[mode];

  return (
    <div className={styles.page}>
      <Card>
        <h1 className={styles.title}>{copy.title}</h1>
        <AuthForm key={mode} mode={mode} />
        <p className={styles.switch}>
          {copy.prompt} <Link to={copy.linkTo}>{copy.linkLabel}</Link>
        </p>
      </Card>
    </div>
  );
}
