export type MessageType = "text" | "image" | "code";

export interface MessageSender {
  id: string;
  name: string;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  type: MessageType;
  createdAt: string | number | Date;
  sender: MessageSender;
  text?: string;
  imageUrl?: string;
  imageAlt?: string;
  code?: string;
  language?: string;
}

export interface MentionItem {
  id: string;
  label: string;
  avatarUrl?: string;
}

export type RealtimeChatProps = {
  messages: Message[];
  onSend: (text: string) => void | Promise<void>;

  className?: string;
  currentUserId?: string;
  placeholder?: string;
  disabled?: boolean;

  mentions?: MentionItem[];

  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void | Promise<void>;

  /** 像素阈值：滚动到顶部多少范围内触发加载 */
  loadMoreThresholdPx?: number;
};

