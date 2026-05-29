import Spinner from '../../components/Spinner/Spinner.jsx';
import FormError from '../../components/FormError/FormError.jsx';
import TaskItem from './TaskItem.jsx';
import styles from './TaskList.module.scss';

export default function TaskList({ tasks, loading, error, onUpdate, onDelete }) {
  if (loading) {
    return (
      <div className={styles.state}>
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <FormError message={error} />;
  }

  if (tasks.length === 0) {
    return <p className={styles.empty}>No tasks yet.</p>;
  }

  return (
    <ul className={styles.list}>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}
