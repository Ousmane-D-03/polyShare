export default function Card({ 
  children, 
  className = '',
  hover = false,
  clickable = false,
  onClick,
  ...props 
}) {
  const hoverClass = hover ? 'hover:shadow-lg transition-shadow duration-200' : '';
  const clickableClass = clickable ? 'cursor-pointer' : '';
  
  return (
    <div 
      className={`card ${hoverClass} ${clickableClass} ${className}`}
      onClick={onClick}
      {...props}
    >
      {children}
    </div>
  );
}
