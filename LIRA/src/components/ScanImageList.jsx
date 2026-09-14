import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowDown, GripVertical, X, ZoomIn, ZoomOut } from "lucide-react";

function ImagePage({ file, index, count, onMove, onRemove, onDragStart, onDragEnd, onDragOver, onDrop, highlighted }) {
  const [url, setUrl] = useState("");
  const [zoomed, setZoomed] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  return (
    <li onDragOver={onDragOver} onDrop={onDrop} className="rounded-xl p-2 min-w-0"
      style={{ background: highlighted ? "#EAF7EE" : "#fff", border: `2px solid ${highlighted ? "#3D995A" : "#E6DECF"}` }}>
      <div draggable onDragStart={onDragStart} onDragEnd={onDragEnd} className="cursor-grab active:cursor-grabbing">
        <div className="flex items-center justify-between mb-2 text-xs font-semibold">
          <span>Page {index + 1}</span><GripVertical size={16} aria-hidden="true" />
        </div>
        <button type="button" className="block w-full cursor-zoom-in" aria-label={`Enlarge page ${index + 1}: ${file.name}`}
          onClick={() => { setZoomed(false); dialogRef.current?.showModal(); }}>
          <img src={url || undefined} alt={`Page ${index + 1}: ${file.name}`} draggable={false}
            className="w-full h-36 object-contain rounded-lg" style={{ background: "#F6F3EE" }} />
        </button>
      </div>
      <p className="truncate text-xs mt-2" title={file.name}>{file.name}</p>
      <div className="flex justify-between mt-2">
        <button type="button" className="p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" aria-label={`Move page ${index + 1} earlier`} disabled={index === 0} onClick={() => onMove(index, index - 1)}><ArrowUp size={16} /></button>
        <button type="button" className="p-1 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed" aria-label={`Move page ${index + 1} later`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}><ArrowDown size={16} /></button>
        <button type="button" className="p-1 cursor-pointer" aria-label={`Remove page ${index + 1}: ${file.name}`} onClick={onRemove}><X size={16} /></button>
      </div>
      <dialog ref={dialogRef} aria-label={`Preview: ${file.name}`}
        className="m-auto p-0 rounded-2xl backdrop:bg-black/70"
        style={{ width: "min(1100px, 96vw)", maxWidth: "96vw", height: "92vh", maxHeight: "92vh", background: "#F6F3EE", color: "#4A4A4A" }}
        onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current.close(); }}>
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-3 p-3 border-b bg-white">
            <span className="flex-1 min-w-0 truncate text-sm">Page {index + 1} · {file.name}</span>
            <button type="button" onClick={() => setZoomed((value) => !value)} className="flex items-center gap-1 text-sm p-2" aria-label={zoomed ? "Fit image" : "Zoom in"}>
              {zoomed ? <ZoomOut size={18} /> : <ZoomIn size={18} />}{zoomed ? "Fit" : "Zoom"}
            </button>
            <button type="button" autoFocus className="p-2 cursor-pointer" aria-label="Close image preview" onClick={() => dialogRef.current.close()}><X size={22} /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-auto p-3">
            <img src={url || undefined} alt={file.name} className={zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}
              onClick={() => setZoomed((value) => !value)}
              style={zoomed ? { width: "200%", maxWidth: "none", height: "auto" } : { width: "100%", height: "100%", objectFit: "contain" }} />
          </div>
        </div>
      </dialog>
    </li>
  );
}

export default function ScanImageList({ images, setImages }) {
  const draggedIndex = useRef(null);
  const [dropIndex, setDropIndex] = useState(null);
  const move = (from, to) => {
    if (from === to || from == null) return;
    setImages((current) => {
      const next = [...current];
      const [file] = next.splice(from, 1);
      next.splice(to, 0, file);
      return next;
    });
  };
  return (
    <ol className="my-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
      {images.map((file, index) => (
        <ImagePage key={`${file.name}-${file.size}-${file.lastModified}-${index}`} file={file} index={index} count={images.length}
          onMove={move} onRemove={() => setImages((current) => current.filter((_, i) => i !== index))}
          highlighted={dropIndex === index}
          onDragStart={(event) => {
            draggedIndex.current = index;
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", String(index));
          }}
          onDragEnd={() => { draggedIndex.current = null; setDropIndex(null); }}
          onDragOver={(event) => {
            if (draggedIndex.current === null) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setDropIndex(index);
          }}
          onDrop={(event) => {
            event.preventDefault();
            move(draggedIndex.current, index);
            draggedIndex.current = null;
            setDropIndex(null);
          }} />
      ))}
    </ol>
  );
}
