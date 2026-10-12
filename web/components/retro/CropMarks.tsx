export function CropMarks() {
  return (
    <>
      {(['tl', 'tr', 'bl', 'br'] as const).map((p) => (
        <span key={p} aria-hidden="true" data-pos={p} className="crop-mark" />
      ))}
    </>
  )
}
