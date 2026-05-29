import { useForm } from '../../hooks/useForm.js';
import TextInput from '../../components/TextInput/TextInput.jsx';
import Select from '../../components/Select/Select.jsx';
import Button from '../../components/Button/Button.jsx';
import { TASK_STATUSES } from './statuses.js';
import styles from './TaskFilters.module.scss';

const EMPTY = { status: '', search: '' };
const STATUS_OPTIONS = [{ value: '', label: 'All' }, ...TASK_STATUSES];

export default function TaskFilters({ onApply }) {
  const { values, handleChange, reset } = useForm(EMPTY);

  function handleSubmit(e) {
    e.preventDefault();
    onApply(values);
  }

  function handleClear() {
    reset();
    onApply(EMPTY);
  }

  return (
    <form className={styles.filters} onSubmit={handleSubmit}>
      <Select
        id="filter-status"
        name="status"
        label="Status"
        value={values.status}
        onChange={handleChange}
        options={STATUS_OPTIONS}
      />
      <TextInput
        id="filter-search"
        name="search"
        label="Search"
        value={values.search}
        onChange={handleChange}
      />
      <div className={styles.actions}>
        <Button type="submit">Apply</Button>
        <Button type="button" variant="secondary" onClick={handleClear}>
          Clear
        </Button>
      </div>
    </form>
  );
}
