const CONFIG = {
  models: [
    { id: "claude", name: "Claude Opus 4.6" },
    { id: "gpt", name: "GPT 5.2-high" },
    { id: "gemini", name: "Gemini 3.1 Pro Review" },
    { id: "pangu", name: "盘古" },
  ],
  personas: [
    {
      id: "pm",
      name: "产品经理",
      icon: "📋",
      scenario: "团队项目管理工具原型",
      prompt:
        "做一个团队项目管理工具的原型，核心功能包括：项目看板（支持拖拽任务卡片在待办/进行中/已完成之间移动）、团队成员管理（头像+角色）、任务详情弹窗（标题/描述/负责人/截止日期/优先级）。目标用户是 10-30 人的互联网团队",
      dimensions: [
        "交互逻辑正确性 — 核心功能都实现了，流程能走通，点击有响应，拖拽能动",
        "视觉可接受度 — 不要求像素级还原，但看起来够专业，能直接拿去给老板汇报",
        "生成速度 — 从输入需求到拿到可用结果的等待时间，越快越好",
        "修改迭代能力 — 追加修改指令后能正确调整，不会改一处坏别处",
      ],
      models: {
        claude: { type: "file", path: "pages/pm-项目管理/claude/index.html" },
        gpt: { type: "file", path: "pages/pm-项目管理/gpt/index.html" },
        gemini: { type: "file", path: "pages/pm-项目管理/gemini/index.html" },
        pangu: { type: "file", path: "pages/pm-项目管理/pangu/index.html" },
      },
    },
    {
      id: "dev",
      name: "开发者",
      icon: "💻",
      scenario: "React+TS 实时聊天组件",
      prompt:
        "用 React + TypeScript + Tailwind CSS 创建一个实时聊天组件，要求：消息列表（支持文字、图片、代码块三种消息类型，带时间戳和头像）、底部输入框（支持 Shift+Enter 换行、@ 提及自动补全）、新消息自动滚动到底部、加载历史消息时保持滚动位置。导出 Props 类型定义和 Message 接口",
      dimensions: [
        "复杂组件可信度与可集成性 — 生成的复杂组件/算法逻辑可信、没有隐含漏洞，能直接集成进现有工程",
        "重复性代码效率替代 — 简单、重复性的代码能准确生成，省去手写时间",
        "可运行性 — 代码没有 bug，能预览、能跑通，不需要反复调试才能运行",
      ],
      models: {
        claude: { type: "file", path: "pages/dev-聊天组件/claude/index.html" },
        gpt: { type: "file", path: "pages/dev-聊天组件/gpt/index.html" },
        gemini: { type: "file", path: "pages/dev-聊天组件/gemini/index.html" },
        pangu: { type: "file", path: "pages/dev-聊天组件/pangu/index.html" },
      },
    },
    {
      id: "designer",
      name: "设计师",
      icon: "🎨",
      scenario: "还原设计稿",
      prompt:
        "精确还原这个笔记详情页设计，保持颜色、字体、间距、圆角完全一致。「旅行初稿」分组默认展开，「旅行票据」和「剪藏」默认收起，点击可切换展开/收起。头像和图标用占位符替代。右上角 ··· 按钮点击后，圆形按钮原地形变展开为菜单面板（包含「编辑」「置顶」「删除」三个选项），动效 300ms 弹性缓动，菜单项依次淡入，点击外部区域时反向收回圆形。",
      dimensions: [
        "视觉匹配度 — 布局、设计元素与原稿一致，一次生成达到 80% 还原度才被认为可用",
        "动效实现度 — 描述的 motion 是否按预期工作，动画在浏览器中真正可运行",
      ],
      models: {
        claude: {
          type: "file",
          path: "pages/designer-设计稿/claude/index.html",
        },
        gpt: { type: "file", path: "pages/designer-设计稿/gpt/index.html" },
        gemini: { type: "file", path: "pages/designer-设计稿/gemini/index.html" },
        pangu: {
          type: "file",
          path: "pages/designer-设计稿/pangu/index.html",
        },
      },
    },
    {
      id: "user",
      name: "普通用户",
      icon: "👤",
      scenario: "番茄钟",
      prompt:
        "帮我做一个番茄钟，可以设置工作和休息时间，要好看，时间到了提醒我",
      dimensions: [
        "需求理解度 — 简单的日常描述被正确翻译成好用的功能，不需要学技术术语",
        "视觉美观度 — 信息主次分明，默认生成的视觉质量高，看起来像正经产品",
      ],
      extraModels: [{ id: "dove", name: "Dove" }],
      models: {
        claude: { type: "file", path: "pages/user-番茄钟/claude/index.html" },
        gpt: { type: "file", path: "pages/user-番茄钟/gpt/index.html" },
        gemini: { type: "file", path: "pages/user-番茄钟/gemini/index.html" },
        pangu: { type: "file", path: "pages/user-番茄钟/pangu/index.html" },
        dove: { type: "file", path: "pages/user-番茄钟/dove/index.html" },
      },
    },
    {
      id: "vibe",
      name: "Vibe Coder",
      icon: "🍜",
      scenario: "「饭搭子」即时拼饭小程序",
      prompt:
        "我想做一个叫'饭搭子'的小程序，解决一个人不想吃饭的问题。核心玩法：发布一条'饭局'（今晚想吃火锅，望京附近，7点，2-4人），附近的人刷到后可以'接搭'加入。关键机制：每个饭局有 30 分钟倒计时，倒计时内凑不够最低人数自动取消；加入时能看到发起人的'口味 DNA'（辣度偏好/忌口/人均预算），避免踩雷；吃完后 AA 分账，互相评价生成'搭子信用分'。首页是附近的饭局列表，能按菜系和时间筛选。整体风格要轻松、有食欲感，不要太社交压力。",
      dimensions: [
        "概念理解准确度 — 创新和复杂的产品愿景被准确翻译，不被简化成已有产品的克隆",
        "视觉新颖度 — 视觉设计有独特感和新意，不是千篇一律的模板风格",
      ],
      models: {
        claude: { type: "file", path: "pages/vibe-饭搭子/claude/index.html" },
        gpt: { type: "file", path: "pages/vibe-饭搭子/gpt/index.html" },
        gemini: {
          type: "file",
          path: "pages/vibe-饭搭子/gemini/index.html",
        },
        pangu: { type: "file", path: "pages/vibe-饭搭子/pangu/index.html" },
      },
    },
  ],
  // 跨场景通用评测维度
  commonDimensions: [
    "字号层级 — 标题/正文/辅助文字有明确区分",
    "颜色可读性 — 文字与背景对比度达标，配色协调",
    "间距节奏 — 元素间距有规律，呼吸感适当",
    "布局信息层级 — 重要内容突出，视觉流合理",
    "整体产品感 — 不像 demo/作业，像一个真正的产品",
  ],
};
