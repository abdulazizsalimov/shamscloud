import { useLocale } from "@/providers/LocaleProvider";
import { formatFileSize } from "@/lib/utils";

interface StorageQuotaProps {
  usedBytes: number | string;
  totalBytes: number | string;
}

export function StorageQuota({ usedBytes, totalBytes }: StorageQuotaProps) {
  const { t } = useLocale();
  
  // Преобразуем строки в числа при необходимости
  const usedBytesNum = typeof usedBytes === 'string' ? parseInt(usedBytes, 10) : usedBytes || 0;
  const totalBytesNum = typeof totalBytes === 'string' ? parseInt(totalBytes, 10) : totalBytes || 10 * 1024 * 1024 * 1024; // 10GB по умолчанию
  
  // Calculate percentage used
  const percentUsed = totalBytesNum > 0 ? (usedBytesNum / totalBytesNum) * 100 : 0;
  
  // Determine color based on usage
  const getProgressColor = () => {
    if (percentUsed > 90) return "bg-red-500";
    if (percentUsed > 70) return "bg-yellow-500";
    return "bg-primary";
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-sm font-medium mb-2">{t("dashboard.storageUsage")}</h3>
      
      <div className="relative h-2.5 mb-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
        <div 
          className={`absolute h-full rounded-full ${getProgressColor()}`} 
          style={{ width: `${Math.min(percentUsed, 100)}%` }}
        ></div>
      </div>
      
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {formatFileSize(usedBytesNum)} {t("dashboard.of")} {formatFileSize(totalBytesNum)}
      </p>
    </div>
  );
}
