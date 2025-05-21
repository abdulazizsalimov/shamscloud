import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useLocale } from '@/providers/LocaleProvider';
import { UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface FileUploadProps {
  onUploadFiles: (files: FileList | File[]) => Promise<void>;
  currentPath: number | null;
  disabled?: boolean;
}

export function FileUpload({ onUploadFiles, currentPath, disabled = false }: FileUploadProps) {
  const { t } = useLocale();
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0 || disabled) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          const next = prev + 5;
          return next < 95 ? next : prev;
        });
      }, 300);
      
      // Perform the actual upload
      await onUploadFiles(acceptedFiles);
      
      // Complete the progress
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset after a delay
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 1000);
    } catch (error) {
      console.error('Upload error:', error);
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [onUploadFiles, disabled]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    disabled: isUploading || disabled,
  });
  
  return (
    <div className="mb-8">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed rounded-lg p-8 text-center bg-white dark:bg-gray-700 transition-colors
          ${isDragActive ? 'border-primary bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-600'}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center">
          <UploadCloud className="h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium mb-2">{t("dashboard.dragFilesHere")}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t("dashboard.or")}</p>
          <Button disabled={isUploading || disabled}>
            {t("dashboard.selectFiles")}
          </Button>
        </div>
      </div>
      
      {isUploading && (
        <div className="mt-4">
          <p className="text-sm mb-2">{uploadProgress === 100 ? 'Upload complete!' : 'Uploading...'}</p>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );
}
