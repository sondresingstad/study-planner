export function NeedsReviewNote({ note }: { note: string | null }) {
  if (!note) return null;
  return (
    <p className="mt-1.5 text-xs text-warning">
      <span className="font-medium">Needs review:</span> {note}
    </p>
  );
}

export function SourceSnippet({ snippet }: { snippet: string | null }) {
  if (!snippet) return null;
  return <p className="mt-1 text-xs text-muted italic">&ldquo;{snippet}&rdquo;</p>;
}
