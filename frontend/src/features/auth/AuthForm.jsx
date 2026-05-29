import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useForm } from '../../hooks/useForm.js';
import TextInput from '../../components/TextInput/TextInput.jsx';
import Button from '../../components/Button/Button.jsx';
import FormError from '../../components/FormError/FormError.jsx';
import styles from './AuthForm.module.scss';

const COPY = {
  login: { submit: 'Log in', passwordAutoComplete: 'current-password' },
  register: { submit: 'Create account', passwordAutoComplete: 'new-password' },
};

export default function AuthForm({ mode }) {
  const { login, register } = useAuth();
  const { values, handleChange } = useForm({ username: '', password: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const copy = COPY[mode];

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const action = mode === 'register' ? register : login;
      await action(values.username, values.password);
    } catch (err) {
      setError(err.message);
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextInput
        id="username"
        name="username"
        label="Username"
        value={values.username}
        onChange={handleChange}
        autoComplete="username"
        required
        disabled={submitting}
      />
      <TextInput
        id="password"
        name="password"
        label="Password"
        type="password"
        value={values.password}
        onChange={handleChange}
        autoComplete={copy.passwordAutoComplete}
        required
        disabled={submitting}
      />
      <FormError message={error} />
      <Button type="submit" loading={submitting}>
        {copy.submit}
      </Button>
    </form>
  );
}
