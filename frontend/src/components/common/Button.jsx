import styles from './Button.module.css';

function Button({
    children,
    variant = 'primary',  // 'primary', 'secondary', 'danger', 'success'
    size = 'md',         // 'sm', 'md', 'lg'
    fullWidth = false,
    onClick,
    type = 'button',
    disabled = false,
    className = '',
    ...props
}) {
    const buttonClasses = [
        styles.button,
        styles[variant],
        styles[size],
        fullWidth && styles.fullWidth,
        className
    ].filter(Boolean).join(' ');

    return (
        <button
            type={type}
            className={buttonClasses}
            onClick={onClick}
            disabled={disabled}
            {...props}
        >
            {children}
        </button>
    );
}

export default Button;
