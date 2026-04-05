import styles from './Card.module.css';

function Card({
    children,
    title,
    variant = 'default',  // 'default', 'elevated', 'outlined', 'custom'
    padding = 'md',       // 'none', 'sm', 'md', 'lg'
    className = '',
    onClick,
    ...props
}) {
    const cardClasses = [
        styles.card,
        styles[variant],
        styles[`padding-${padding}`],
        className
    ].filter(Boolean).join(' ');

    return (
        <div className={cardClasses} onClick={onClick} {...props}>
            {title && <div className={styles.title}>{title}</div>}
            <div className={styles.content}>
                {children}
            </div>
        </div>
    );
}

export default Card;
