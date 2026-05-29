import { useState } from 'react';
import { useForm } from '../../hooks/useForm.js';
import TextInput from '../../components/TextInput/TextInput.jsx';
import Select from '../../components/Select/Select.jsx';
import Button from '../../components/Button/Button.jsx';
import FormError from '../../components/FormError/FormError.jsx';
import { TASK_STATUSES } from './statuses.js';
import styles from './TaskForm.module.scss';

export default function TaskForm({ initialValues, submitLabel, onSubmit, onCancel }) {
  const { values, handleChange, reset } = useForm(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    const title = values.title.trim();
    if (!title) {
      setError('Title is required');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit({ ...values, title });
      reset();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <TextInput
        id="task-title"
        name="title"
        label="Title"
        value={values.title}
        onChange={handleChange}
        required
        disabled={submitting}
      />
      <div className={styles.field}>
        <label htmlFor="task-description" className={styles.label}>
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          className={styles.textarea}
          rows={3}
          value={values.description}
          onChange={handleChange}
          disabled={submitting}
        />
      </div>
      <Select
        id="task-status"
        name="status"
        label="Status"
        value={values.status}
        onChange={handleChange}
        options={TASK_STATUSES}
        disabled={submitting}
      />
      <FormError message={error} />
      <div className={styles.actions}>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
