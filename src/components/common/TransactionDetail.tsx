import styles from "./TransactionDetail.module.css";

interface TransactionDetailProps {
  icon: React.ReactNode;
  merchant: string;
  date: string;
  amount: number;
  type: string;
  note?: string;
}

const TransactionDetail = ({
  icon,
  merchant,
  date,
  amount,
  type,
  note,
}: TransactionDetailProps) => {
  return (
    <div className={styles.TransactionDetailContainer}>
      <div className={styles.LeftContainer}>
        <div>{icon}</div>
        <div className={styles.TextContainer}>
          <div>{merchant}</div>
          <div style={{ fontSize: '0.85em', opacity: 0.6 }}>{date}</div>
          <div>{type}</div>
          {note && <div style={{ fontSize: '0.8em', opacity: 0.5, fontStyle: 'italic' }}>{note}</div>}
        </div>
      </div>

      <div>
        {amount.toLocaleString("en-US", {
          style: "currency",
          currency: "USD",
        })}
      </div>
    </div>
  );
};

export default TransactionDetail;
