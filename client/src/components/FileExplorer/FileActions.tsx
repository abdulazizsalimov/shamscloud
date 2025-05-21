import { useState } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import { UploadCloud, FolderPlus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface FileActionsProps {
  onSearchChange: (query: string) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onUploadClick: () => void;
  isUploading?: boolean;
}

export function FileActions({
  onSearchChange,
  onCreateFolder,
  onUploadClick,
  isUploading = false,
}: FileActionsProps) {
  const { t } = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [isFolderDialogOpen, setIsFolderDialogOpen] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearchChange(value);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    
    try {
      setIsCreatingFolder(true);
      await onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsFolderDialogOpen(false);
    } catch (error) {
      console.error("Error creating folder:", error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={onUploadClick}
          disabled={isUploading}
          className="inline-flex items-center"
        >
          <UploadCloud className="mr-2 h-4 w-4" />
          <span>{t("dashboard.upload")}</span>
        </Button>

        <Dialog open={isFolderDialogOpen} onOpenChange={setIsFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="inline-flex items-center"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              <span>{t("dashboard.newFolder")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("dashboard.newFolder")}</DialogTitle>
              <DialogDescription>
                {t("dashboard.enterNewName")}
              </DialogDescription>
            </DialogHeader>
            <Input
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={t("dashboard.folder")}
              autoFocus
            />
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsFolderDialogOpen(false)}
                disabled={isCreatingFolder}
              >
                {t("common.cancel")}
              </Button>
              <Button 
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || isCreatingFolder}
              >
                {isCreatingFolder ? t("common.loading") : t("common.create")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="w-full md:w-auto">
        <div className="relative">
          <Input 
            type="text"
            placeholder={t("dashboard.searchFiles")}
            value={searchQuery}
            onChange={handleSearchChange}
            className="pl-10 pr-4 py-2 w-full"
          />
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
        </div>
      </div>
    </div>
  );
}
