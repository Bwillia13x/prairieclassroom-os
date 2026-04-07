import { useCallback, useState } from "react";
import "./FileUploadZone.css";

interface Props {
  onTextExtracted: (text: string, filename: string) => void;
  accept?: string;
}

export default function FileUploadZone({ onTextExtracted, accept = ".txt,.pdf" }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setProcessing(true);

    try {
      if (file.name.endsWith(".txt")) {
        const text = await file.text();
        onTextExtracted(text, file.name);
      } else if (file.name.endsWith(".pdf")) {
        // For PDF, read as text (basic extraction — works for text-based PDFs)
        // A production system would use pdf-parse on the backend
        const text = await file.text();
        // If the text looks like binary/garbled, show a helpful message
        if (text.includes("%PDF") && text.length < 200) {
          setError("This PDF appears to be image-based. Please paste the text content instead.");
          setProcessing(false);
          return;
        }
        onTextExtracted(text, file.name);
      } else {
        setError(`Unsupported file type: ${file.name}. Use .txt or .pdf files.`);
        setProcessing(false);
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read file");
    }

    setProcessing(false);
  }, [onTextExtracted]);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = ""; // Reset so same file can be re-selected
  }

  return (
    <div
      className={`file-upload-zone${dragOver ? " file-upload-zone--dragover" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        onChange={handleInputChange}
        className="file-upload-input"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="file-upload-label">
        {processing ? (
          <span>Reading file...</span>
        ) : (
          <>
            <svg className="file-upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d="M12 16V4m0 0l-4 4m4-4l4 4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" />
            </svg>
            <span>Drop a file here or <strong>browse</strong></span>
            <span className="file-upload-hint">.txt or .pdf</span>
          </>
        )}
      </label>
      {error && <p className="file-upload-error">{error}</p>}
    </div>
  );
}
