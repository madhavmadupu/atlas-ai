import { UploadCloud } from "lucide-react";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface DocumentUploadProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpload: (file: File) => Promise<void>;
}

export function DocumentUpload({ open, onOpenChange, onUpload }: DocumentUploadProps) {
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            if (acceptedFiles.length === 0) return;

            setIsUploading(true);
            try {
                await onUpload(acceptedFiles[0]);
                onOpenChange(false);
            } catch (error) {
                console.error("Upload failed", error);
            } finally {
                setIsUploading(false);
            }
        },
        [onUpload, onOpenChange]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "text/plain": [".txt"],
            "text/markdown": [".md"],
            "application/pdf": [".pdf"],
        },
        maxFiles: 1,
        disabled: isUploading,
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Upload Knowledge</DialogTitle>
                    <DialogDescription>
                        Upload documents (PDF, TXT, MD) to add to the RAG knowledge base.
                    </DialogDescription>
                </DialogHeader>

                <div
                    {...getRootProps()}
                    className={`
            flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed p-8 text-center transition-colors
            ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
            ${isUploading ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-muted/50"}
          `}
                >
                    <input {...getInputProps()} />
                    <div className="rounded-full bg-muted p-4">
                        <UploadCloud className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-1">
                        <p className="font-medium">
                            {isUploading ? "Uploading & Ingesting..." : "Click or drag to upload"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Supports .txt, .md, .pdf (max 10MB)
                        </p>
                    </div>
                </div>

                <DialogFooter className="sm:justify-start">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onOpenChange(false)}
                        disabled={isUploading}
                    >
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
