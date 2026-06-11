import { useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface Props {
  onUpload: (files: File[]) => void;
  uploading: boolean;
}

export function ResumeUpload({ onUpload, uploading }: Props) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) onUpload(acceptedFiles);
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: true,
  });

  return (
    <div {...getRootProps()} className={`card text-center cursor-pointer transition-all ${isDragActive ? "bg-yellow-200 scale-[1.02]" : ""}`}>
      <input {...getInputProps()} />
      <div className="py-6">
        <span className="text-4xl block mb-3">{uploading ? "⏳" : isDragActive ? "📥" : "📄"}</span>
        {uploading
          ? <p className="font-display font-bold text-sm">Uploading...</p>
          : <><p className="font-display font-bold text-sm mb-1">{isDragActive ? "Drop resumes here" : "Drop your resume here"}</p><p className="text-xs opacity-60">or click to browse (PDF, DOCX — up to 10MB each)</p><p className="text-xs opacity-60 mt-1">Multiple files supported</p></>
        }
      </div>
    </div>
  );
}
