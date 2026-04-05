# Path 几何结构重构方案

## 背景

当前仓库中，线条相关逻辑把 SVG path 的 `d` 值统一抽象为 [`Path`](../src/constants/lines.ts)，其定义仅为 `` `M${string}` ``。这意味着类型系统只能保证“字符串以 `M` 开头”，无法表达以下关键信息：

- 这是开口路径还是闭合区域
- 这是单段直线、单拐点折线、圆角拐线，还是由多段路径拼接得到的复杂路径
- 哪些几何 helper 只能处理 `M L`
- 哪些几何 helper 只能处理 `M L C L`
- 哪些 helper 已经具备处理任意 open path 的能力

这导致了一系列问题：

- 几何 helper 依赖隐含的 path 结构假设，但参数类型无法体现这些假设
- 同一个 `LinePathType` 在经过 auto simple、parallel、reconcile 等后处理后，实际 path 结构会发生变化
- 多处代码通过正则、`split('L')`、`substring(2)` 等方式手工解析 path 字符串，逻辑分散且容易出错
- 某些 style 或工具函数把“编辑器里的路径类型”误当成“几何命令结构”，从而在不支持的 path 上运行错误的算法

本次重构的第一目标不是直接重写所有几何算法，而是先把 path 的“几何结构类型”建立起来，并把现有 helper 的输入输出显式收紧。

## 现状梳理

### 基础 path 生成器

当前线条 path 主要由以下生成器产生：

- `simple`：输出 `M L`
- `diagonal`：先生成 `M L L`，再经 `roundPathCorners()` 变成 `M L L` 或 `M L C L`
- `perpendicular`：先生成 `M L L`，再经 `roundPathCorners()` 变成 `M L L` 或 `M L C L`
- `rotate-perpendicular`：先生成 `M L L`，再经 `roundPathCorners()` 变成 `M L L` 或 `M L C L`
- `ray-guided`：在退化场景下输出 `M L`，否则生成 `M L L` 再交给 `roundPathCorners()`

因此，仅从基础生成器来看，当前仓库实际出现的 open path 命令结构至少包括：

- `M L`
- `M L L`
- `M L C L`

### 会改变实际 path 结构的后处理

即使边的声明类型仍然是 `Diagonal`、`Perpendicular` 等，后处理也可能改变最终 path 的几何结构。

#### auto simple

`checkSimplePathAvailability()` 会把原本的非 `Simple` 路径转换成一条实际上的 `M L`。

#### parallel

parallel 逻辑会基于基础 path 生成偏移路径，而且会把基础路径的 `roundCornerFactor` 至少提升到 1。也就是说，即使声明属性里允许无圆角，parallel 阶段拿到的基础 path 也可能已经变成圆角路径。

#### reconcile

`makeReconciledPath()` 会把多条 open path 串接成一条更长的 open path，例如：

- `M L L L`
- `M L C L C L`
- `M L C L L C L`

因此，“是否为 reconcile 产物”并不是 path 分类的第一维；真正决定几何算法是否适用的是命令结构本身。

### 当前依赖 path 结构的关键逻辑

仓库中存在多处把 path 当成“可解析语法”而不是“黑盒字符串”的逻辑，主要包括：

- `bezier-parallel.ts`
  - 旧实现用正则提取 `M`、首个 `L`、首个 `C`、末尾 `L`
  - 实际只支持非常有限的短路径
- `mrt-tape-out.tsx`
  - 通过 `substring(2).split('L')` 假定输入为 `M L`
- `reconcile.ts`
  - 通过正则删除后续子路径的 `M x y`
- `nodes/fill.tsx`
  - 通过 `split(' ')` 和 `slice(3)` 删除后续段的 `M x y`

这些逻辑说明：在现状下，真正需要的不是“统一一个字符串类型”，而是“统一一套可操作的 path 结构对象”。

## 目标

本次重构的目标分为两层。

### 目标一：建立 path 的几何结构类型

将 path 的抽象从“任意以 `M` 开头的字符串”升级为“明确命令结构的几何对象”，并在对象中保留可直接渲染的 `d` 字符串。

### 目标二：让几何 helper 的参数和返回值与 path 结构匹配

例如：

- 只能处理 `M L` 的 helper 必须显式要求 `LinearPath`
- 只能处理单拐点路径的 helper 必须显式要求 `ShortOpenPath`
- 真正支持任意 open path 的 helper 才能接收 `OpenPath`

最终应避免以下情况：

- 把 `LinePathType` 当成 path 结构类型使用
- 把 `ComplexOpenPath` 误传给只能处理单段或单拐点路径的 helper
- 把 open path 和 closed area path 混用

## 类型模型

### 命令类型

第一阶段只支持当前仓库实际使用到的绝对命令子集：

- `M`
- `L`
- `C`
- `Z`

建议定义如下：

```ts
export interface PathPoint {
    x: number;
    y: number;
}

export interface MoveTo {
    cmd: 'M';
    to: PathPoint;
}

export interface LineTo {
    cmd: 'L';
    to: PathPoint;
}

export interface CubicTo {
    cmd: 'C';
    c1: PathPoint;
    c2: PathPoint;
    to: PathPoint;
}

export interface ClosePath {
    cmd: 'Z';
}

export type OpenPathDrawCommand = LineTo | CubicTo;
```

### path 结构类型

建议把“编辑器路径类型”与“几何结构类型”彻底分离，几何结构类型统一使用 `Path` 命名。

```ts
export interface BasePath<C extends readonly unknown[]> {
    readonly kind: string;
    readonly commands: C;
    readonly d: string;
}

export interface LinearPath extends BasePath<readonly [MoveTo, LineTo]> {
    readonly kind: 'ml';
}

export interface SharpTurnPath extends BasePath<readonly [MoveTo, LineTo, LineTo]> {
    readonly kind: 'mll';
}

export interface RoundedTurnPath extends BasePath<readonly [MoveTo, LineTo, CubicTo, LineTo]> {
    readonly kind: 'mlcl';
}

export interface ComplexOpenPath
    extends BasePath<readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[]]> {
    readonly kind: 'complex-open';
}

export interface ClosedAreaPath
    extends BasePath<readonly [MoveTo, OpenPathDrawCommand, OpenPathDrawCommand, ...OpenPathDrawCommand[], ClosePath]> {
    readonly kind: 'closed-area';
}

export type OpenPath = LinearPath | SharpTurnPath | RoundedTurnPath | ComplexOpenPath;

export type Path = OpenPath | ClosedAreaPath;

export type ShortOpenPath = LinearPath | SharpTurnPath | RoundedTurnPath;
```

### 分类原则

本次分类以“实际命令结构”为准，而不是“来源”或“编辑器里的路径类型”。

#### `LinearPath`

对应 `M L`。

典型来源：

- `simple`
- `ray-guided` 退化为直线
- auto simple

#### `SharpTurnPath`

对应 `M L L`。

典型来源：

- `diagonal` / `perpendicular` / `rotate-perpendicular` 在 `roundCornerFactor = 0` 时
- reconcile 后如果整体只有一个折点且没有圆角

#### `RoundedTurnPath`

对应 `M L C L`。

典型来源：

- `diagonal` / `perpendicular` / `rotate-perpendicular` 圆角化后
- `ray-guided` 非退化时圆角化后

#### `ComplexOpenPath`

表示所有更长的 open path，包括但不限于：

- `M L L L`
- `M L C L C L`
- `M L C L L C L`

它不表示来源，仅表示“几何结构已超出前三种精确模型”。

#### `ClosedAreaPath`

表示以 `Z` 结束的闭合区域路径，例如：

- fill 的封闭区域
- offset/outline 算法生成的闭合 band

## 核心约束

### 渲染层不直接处理命令数组

React 组件和 DOM 更新逻辑使用 `path.d`，而不是直接拼接字符串。

例如：

```tsx
<path d={path.d} />
elem.setAttribute('d', path.d);
```

### 结构解析集中到单一模块

仓库中不再允许散落的 path 字符串手工解析逻辑，例如：

- `split('L')`
- `substring(2)`
- 正则提取 `M/L/C`
- 手写删除前导 `M x y`

这些逻辑应统一收敛到 path 模块中。

### helper 只接受其真实支持的 path 结构

例如：

- `mrt-tape-out` 只接受 `LinearPath`
- 旧 `makeShortPathParallel` / `makeShortPathOutline` 第一阶段只接受 `ShortOpenPath`
- 通用 parallel / outline 第二阶段扩展到 `OpenPath`

## 变更步骤

### 切片 1：建立 path 基础设施

目标：

- 新增统一的 path 类型模块
- 定义命令类型、union 结构、序列化和解析工具
- 在核心类型层引入 `Path`

计划修改：

- `src/util/path-shape.ts`
- `src/constants/lines.ts`

### 切片 2：改造所有 path 生产者

目标：

- 让所有 `generatePath()` 从返回字符串改为返回 `OpenPath`

计划修改：

- `src/components/svgs/lines/paths/simple.tsx`
- `src/components/svgs/lines/paths/diagonal.tsx`
- `src/components/svgs/lines/paths/perpendicular.tsx`
- `src/components/svgs/lines/paths/rotate-perpendicular.tsx`
- `src/components/svgs/lines/paths/ray-guided.tsx`

### 切片 3：替换所有手工 path 解析逻辑

目标：

- 把所有依赖字符串语法的逻辑切换到结构化 path API

计划修改：

- `src/util/reconcile.ts`
- `src/components/svgs/nodes/fill.tsx`
- `src/components/svgs/lines/styles/mrt-tape-out.tsx`
- `src/util/bezier-parallel.ts`

### 切片 4：铺到渲染和样式边界

目标：

- 让 line style、SVG 渲染层、DOM 直接更新逻辑全部消费 `Path`

计划修改：

- `src/components/svg-layer.tsx`
- `src/components/svg-canvas-graph.tsx`
- `src/util/imperative-dom.ts`
- 所有 line style 组件

## 几何 helper 的迁移策略

### 第一阶段

先把 helper 的签名收紧到其当前真实支持的 path 结构，而不是一上来就做通用算法。

例如：

- `splitLinearPath(path: LinearPath)`
- `makeShortPathParallel(path: ShortOpenPath, ...)`
- `makeShortPathOutline(path: ShortOpenPath, ...)`

### 第二阶段

在类型边界已经稳定后，再实现真正的通用算法：

- `makeParallelOpenPath(path: OpenPath, ...)`
- `makeOutlineOpenPath(path: OpenPath, ...)`

届时旧的 `short` helper 可以删除，或降级为对单拐点路径的专用优化实现。

## 风险与注意事项

### 不要把 `LinePathType` 当成几何结构类型

`LinePathType` 仍然是编辑器层的“声明路径类型”，例如 `Simple`、`Diagonal`、`Perpendicular`。它不能替代 path 的实际命令结构。

### reconcile 后 path 结构必须重新分类

reconcile 的输出不应继承输入边的 path 结构类型，而应重新根据命令序列得到：

- `Linear`
- `SharpTurn`
- `RoundedTurn`
- `ComplexOpen`

### 闭合区域与开口线路必须分开

fill、outline 这类闭合路径不能继续复用 open path 类型，否则后续算法仍然会混淆。

### 迁移期允许“字符串进入，结构化输出”

在切片 1 到切片 3 之间，允许少量 legacy helper 暂时输出字符串，但这些字符串必须在边界层立即转换为结构化 `Path`，不能继续在业务层传递为裸 string。

## 完成标志

当满足以下条件时，本次重构的第一阶段可视为完成：

- 仓库中不再以 `` `M${string}` `` 作为线条 path 的核心类型
- 所有 `generatePath()` 返回 `OpenPath`
- 所有 path 拼接与拆分逻辑都通过统一的 path 工具完成
- 关键几何 helper 的参数和返回值已收紧到真实支持的 path 结构
- 渲染层统一通过 `path.d` 读取 SVG `d` 字符串

第二阶段则是把 parallel/outline 等 helper 从“短路径专用”推广到“任意 open path 通用”。
