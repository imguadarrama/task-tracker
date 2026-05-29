import styles from './Card.module.scss';

export default function Card({ as: Tag = 'div', children }) {
  return <Tag className={styles.card}>{children}</Tag>;
}
