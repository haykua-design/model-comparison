# RealtimeChat（React + TS + Tailwind）

一个可直接拷贝/引入的实时聊天 UI 组件：
- 消息列表：文字 / 图片 / 代码块，带头像与时间戳
- 输入框：`Shift+Enter` 换行、`@` 提及自动补全
- 新消息自动滚动到底部
- 加载历史消息（向上翻）时保持滚动位置

## 使用方式

```tsx
import { RealtimeChat, type Message, type MentionItem } from "./react-realtime-chat";

const mentions: MentionItem[] = [
  { id: "alice", label: "Alice" },
  { id: "bob", label: "Bob" },
];

const messages: Message[] = [
  {
    id: "m1",
    type: "text",
    createdAt: Date.now(),
    sender: { id: "alice", name: "Alice" },
    text: "Hello",
  },
  {
    id: "m2",
    type: "image",
    createdAt: Date.now(),
    sender: { id: "bob", name: "Bob" },
    imageUrl: "https://picsum.photos/600/360",
    text: "一张图",
  },
  {
    id: "m3",
    type: "code",
    createdAt: Date.now(),
    sender: { id: "alice", name: "Alice" },
    language: "ts",
    code: "const x: number = 1;",
  },
];

export function Page() {
  return (
    <div className="h-[600px]">
      <RealtimeChat
        currentUserId="alice"
        messages={messages}
        mentions={mentions}
        onSend={async (text) => {
          console.log("send:", text);
        }}
        hasMore
        onLoadMore={async () => {
          console.log("load more history");
        }}
      />
    </div>
  );
}
```

## 备注
- `onLoadMore` 预期是“向消息列表头部追加更早的消息”，组件会自动修正 `scrollTop` 以保持视觉位置不跳。
- `onSend` 只处理文本输入；图片/代码消息通常由你的业务层决定何时以何种 `Message` 形态追加到 `messages`。

