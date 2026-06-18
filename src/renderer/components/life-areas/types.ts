export interface LifeAreaPanelProps {
  isRefreshing: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onShowSuccess?: (message: string) => void;
}
