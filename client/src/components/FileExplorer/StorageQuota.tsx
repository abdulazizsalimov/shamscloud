import { useLocale } from "@/providers/LocaleProvider";
import { formatFileSize } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";

interface StorageQuotaProps {
  usedBytes: number;
  totalBytes: number;
}

export function StorageQuota({ usedBytes, totalBytes }: StorageQuotaProps) {
  const { t } = useLocale();
  
  // Calculate percentage used
  const percentUsed = (usedBytes / totalBytes) * 100;
  
  // Determine color based on usage
  const getProgressColor = () => {
    if (percentUsed > 90) return "bg-red-500";
    if (percentUsed > 70) return "bg-yellow-500";
    return "bg-primary";
  };
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
      <h3 className="text-sm font-medium mb-2">{t("dashboard.storageUsage")}</h3>
      
      <Progress 
        value={percentUsed} 
        className="h-2.5 mb-2"
        indicatorClassName={getProgressColor()}
      />
      
      <p className="text-xs text-gray-600 dark:text-gray-400">
        {formatFileSize(usedBytes)} {t("dashboard.of")} {formatFileSize(totalBytes)}
      </p>
    </div>
  );
}
