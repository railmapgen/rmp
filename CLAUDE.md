# CLAUDE.md

## 必读文档

在开始任何功能规划或代码修改前，先阅读 `docs/codebase-onboarding.md` 了解项目架构和约定。

## 门禁检查

每次完成代码修改后，必须依次通过以下检查，全部通过后才能视为完成：

1. **TypeScript 类型检查**: `npx tsc --noEmit`
2. **Lint**: `npm run lint`
3. **测试**: `npm test`
