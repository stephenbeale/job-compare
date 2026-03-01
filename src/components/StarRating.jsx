export default function StarRating({ value, onChange, label }) {
  return (
    <div className="star-rating" aria-label={label}>
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          className={`star ${star <= value ? 'filled' : ''}`}
          onClick={() => onChange(star === value ? star - 1 : star)}
          aria-label={`${star} star${star > 1 ? 's' : ''}`}
        >
          {star <= value ? '\u2605' : '\u2606'}
        </button>
      ))}
    </div>
  );
}
