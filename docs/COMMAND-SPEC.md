# 命令速查内容规范（Linux / Git）

本文件是 Linux、Git 命令速查内容的**唯一契约**。写之前先读完；写完必须跑 `node scripts/validate-commands.mjs`，0 错误才算完成。

## 0. 总原则

- 这是给**刚上手 Linux / Git 的同学**看的速查卡：先说人话（解决什么问题、什么时候用），再给真实可用的写法和参数。
- **Linux 与 Git 是两个独立模块，内容严格分开**：分成不同数据文件、不同 module 前缀（`linux-*` / `git-*`）、不同 id 前缀（`linux-*` / `git-*`）；
  - Linux 文件里只能出现 Linux 命令，Git 文件里只能出现 Git 命令，**禁止混写**；
  - `related` 只能引用**同一个 tool 内**的 id，不允许 Linux 引用 Git；
  - 界面会按「Linux 命令」「Git 命令」两个入口、两组模块展示，数据层也不合并两者的模块。
- **不许瞎写**：参数必须是该命令真实存在的选项（GNU/Linux 主流版本；Git 以 git-scm 当前文档为准）；示例必须能照着敲；不确定的写法宁可不写，不编造 `--xxx`。
- 来源只用官方/权威文档（见 §6），不要 CSDN、掘金、博客园等二手内容。
- 简体中文、大白话；不要「非常简单」「一文学会」这类营销话术；一条只讲清一件事。

## 1. 文件与作者分工

| 文件 | 作者 | tool | 模块 |
| --- | --- | --- | --- |
| `src/data/commands-linux-a.json` | content-linux-a | `linux` | linux-file / linux-text / linux-perm |
| `src/data/commands-linux-b.json` | content-linux-b | `linux` | linux-process / linux-network / linux-disk |
| `src/data/commands-git.json` | content-git | `git` | git-setup / git-basic / git-branch / git-remote / git-undo / git-history |

只写自己负责的文件；不要改别人的文件，不要改 `src/data/index.js`、页面与样式（Lead 负责）。

## 2. 固定模块与命令清单（不要增删模块，id 必须完全一致）

### Linux A（`commands-linux-a.json`，tool=`linux`）

| module id | label | 必须收录的命令（name / id） |
| --- | --- | --- |
| `linux-file` | 文件与目录 | `ls`/linux-ls、`cd`/linux-cd、`pwd`/linux-pwd、`mkdir`/linux-mkdir、`rm`/linux-rm、`cp`/linux-cp、`mv`/linux-mv、`touch`/linux-touch、`find`/linux-find、`ln`/linux-ln |
| `linux-text` | 查看与文本处理 | `cat`/linux-cat、`less`/linux-less、`head`/linux-head、`tail`/linux-tail、`grep`/linux-grep、`wc`/linux-wc、`sort`/linux-sort、`cut`/linux-cut、`sed`/linux-sed、`awk`/linux-awk |
| `linux-perm` | 权限与用户 | `chmod`/linux-chmod、`chown`/linux-chown、`umask`/linux-umask、`sudo`/linux-sudo、`su`/linux-su、`useradd`/linux-useradd |

### Linux B（`commands-linux-b.json`，tool=`linux`）

| module id | label | 必须收录的命令（name / id） |
| --- | --- | --- |
| `linux-process` | 进程与系统 | `ps`/linux-ps、`top`/linux-top、`kill`/linux-kill、`pkill`/linux-pkill、`jobs`/linux-jobs、`nohup`/linux-nohup、`systemctl`/linux-systemctl、`free`/linux-free、`uptime`/linux-uptime |
| `linux-network` | 网络与远程 | `ip`/linux-ip、`ping`/linux-ping、`curl`/linux-curl、`wget`/linux-wget、`ss`/linux-ss、`ssh`/linux-ssh、`scp`/linux-scp、`rsync`/linux-rsync |
| `linux-disk` | 磁盘与压缩 | `df`/linux-df、`du`/linux-du、`tar`/linux-tar、`gzip`/linux-gzip、`zip`/linux-zip、`unzip`/linux-unzip |

### Git（`commands-git.json`，tool=`git`）

| module id | label | 必须收录的命令（name / id） |
| --- | --- | --- |
| `git-setup` | 配置与仓库 | `git config`/git-config、`git init`/git-init、`git clone`/git-clone、`git help`/git-help |
| `git-basic` | 提交与查看 | `git status`/git-status、`git add`/git-add、`git commit`/git-commit、`git diff`/git-diff、`git log`/git-log、`git show`/git-show |
| `git-branch` | 分支与合并 | `git branch`/git-branch、`git switch`/git-switch、`git merge`/git-merge、`git rebase`/git-rebase、`git cherry-pick`/git-cherry-pick |
| `git-remote` | 远程协作 | `git remote`/git-remote、`git fetch`/git-fetch、`git pull`/git-pull、`git push`/git-push |
| `git-undo` | 撤销与回退 | `git restore`/git-restore、`git reset`/git-reset、`git revert`/git-revert、`git stash`/git-stash、`git clean`/git-clean、`git rm`/git-rm |
| `git-history` | 历史与排查 | `git blame`/git-blame、`git bisect`/git-bisect、`git reflog`/git-reflog、`git tag`/git-tag、`git worktree`/git-worktree |

- `name` 用完整命令写法（Linux 只写命令名如 `ls`；Git 写 `git config`、`git status`）。
- 命令顺序按上表顺序输出（同一模块内按表顺序）。

## 3. JSON 结构

```json
{
  "generatedBy": "content-linux-a",
  "tool": "linux",
  "modules": [
    { "id": "linux-file", "label": "文件与目录", "desc": "用 10–30 字说明这组命令解决什么问题" }
  ],
  "items": [
    {
      "id": "linux-ls",
      "tool": "linux",
      "module": "linux-file",
      "name": "ls",
      "level": "入门",
      "tagline": "列出目录里有什么",
      "plain": "60–180 个可见字符的大白话……",
      "syntax": "ls [选项] [路径...]",
      "keyPoints": ["3–5 条，每条讲一个真实用法或行为"],
      "options": [
        { "flag": "-l", "desc": "长格式：权限、属主、大小、时间" }
      ],
      "examples": [
        { "desc": "列出当前目录，含隐藏文件", "code": "ls -la" }
      ],
      "pitfalls": ["1–3 条真实的坑"],
      "related": ["linux-cd", "linux-find"],
      "docs": [
        { "label": "man7: ls(1)", "url": "https://man7.org/linux/man-pages/man1/ls.1.html" }
      ],
      "tags": ["目录", "列表"]
    }
  ]
}
```

字段硬性要求：

| 字段 | 要求 |
| --- | --- |
| `generatedBy` | 作者名：`content-linux-a` / `content-linux-b` / `content-git` |
| `tool` | 文件级与条目级都必须等于文件名对应的 `linux` / `git` |
| `modules` | 必须与 §2 指定模块完全一致（id、label、数量、顺序），`desc` 10–40 字 |
| `id` | 必须以 `<tool>-` 开头 + kebab-case；全站唯一；必须与 §2 清单一致 |
| `module` | 必须是本文件 modules 里声明的 id |
| `name` | 与 §2 清单一致 |
| `level` | `入门` 或 `进阶`；每个模块至少 2 条 `进阶` |
| `tagline` | ≤ 22 个汉字，不加句号，说清用途 |
| `plain` | 60–180 个可见字符（去空白算），先讲「什么时候用」，再讲「它做什么」 |
| `syntax` | 以 `name` 开头（后面跟空格或直接结束），用 `[选项]` `[路径...]` 等占位符；长度 5–80 |
| `keyPoints` | 3–5 条，每条 8–80 字，讲行为/组合用法，不重复 plain |
| `options` | 3–8 条；`flag` 必须真实存在（如 `-l`、`--all`、`-n 10`），`desc` 6–60 字；不要凑数。例外：`linux-nohup` 官方只有 `--help` / `--version`，`linux-umask` 为 bash 内建、只有 `-p` / `-S` 两个选项，这两个 id 允许写 2 条（validator 已单独白名单），后台运行、重定向等用法写到 keyPoints / pitfalls，不要伪装成 flag |
| `examples` | 2–4 条；`desc` ≤ 40 字；`code` 单行或极短多行，能直接执行；不要写 `$` 提示符 |
| `pitfalls` | 1–3 条，10–90 字，必须是真实坑（如 `rm -rf` 不可恢复、`git reset --hard` 丢改动） |
| `related` | 2–4 个 id，必须存在于**同一 tool** 且已收录的清单里 |
| `docs` | 1–2 条 `{label,url}`，域名见 §6；Linux 优先 man7.org；Git 第一条必须是 `https://git-scm.com/docs/git-<命令>`（`help` 用 `git-scm.com/docs`） |
| `tags` | 2–5 个，每个 ≤ 8 字 |

JSON 格式：2 空格缩进、UTF-8、无注释、无尾逗号；条目按 §2 顺序排列。

## 4. 事实与写法红线（重点检查）

- **参数必须真实**：选项表里每个 flag 都要能在该命令官方文档里找到；不确定就不写。区分 GNU 与 BSD（如 `sed -i` 在 macOS 要写 `-i ''`，只能在 pitfalls 里提一句，选项表按 GNU 写）。
- **示例必须自洽**：`syntax` 里出现的占位符，示例里要换成真实路径/分支/参数；Git 示例不要假设远端名字一定是 `origin`（可写 `origin`，但 pitfalls 里说明先 `git remote -v` 确认）。
- **破坏性操作讲清楚**：`rm -rf`、`git reset --hard`、`git clean -fdx`、`git push --force`、`chmod 777`、`chown -R` 等必须在 pitfalls 里写明后果。
- **Git 语义不能含糊**：`restore` 与 `reset` 的区别、`revert` 是新增提交而非删除、`fetch` 不合并、`pull` = fetch + merge/rebase、`rebase` 改写历史、`stash` 暂存未提交改动、`worktree` 多工作树。
- **Linux 目标环境**：主流 GNU/Linux + systemd（Ubuntu 22.04+ / Debian 12+ / CentOS Stream 9 这一代）。`ip` 而不是 `ifconfig`；`ss` 而不是 `netstat`；不写发行版专属的 `apt/dnf`（本模块不涉及包管理）。
- **禁止跨模块内容**：Git 文件里不出现 Linux 命令条目，反之亦然；不要在 Linux 条目里讲 Git，也不要在 Git 条目里讲 Linux 权限/进程。README/文案里也不要混成一个「命令」分类。
- **不要写死版本号**：除非官方文档明确（如某选项从哪个版本引入），默认不写版本。

## 5. 中文风格

- 先人话后术语：例「看这个目录里有什么、每个文件多大」而不是「用于目录遍历」。
- 每条 `plain` 交代：解决什么问题 → 最常用的那一个写法 → 一句提醒。
- 不夸大、不吓人；不写「必学」「神器」。句子短，能扫读。

## 6. 来源白名单（docs 只允许这些域名）

- `https://man7.org/linux/man-pages/man1/<cmd>.1.html`（或 man8）、`https://man7.org/linux/man-pages/man5/...`
- `https://www.gnu.org/software/<pkg>/manual/...`（coreutils、tar、gzip、zip 等 GNU 包）
- `https://git-scm.com/docs/git-<cmd>`、`https://git-scm.com/book/zh/v2`（仅 Git）
- `https://man.openbsd.org/ssh.1`、`ssh_config.5`、`scp.1`（OpenSSH 官方）
- `https://curl.se/docs/manpage.html`（curl 官方手册）
- `https://rsync.samba.org/how-rsync-works.html` 或 man7 rsync
- `https://www.freedesktop.org/software/systemd/man/latest/systemctl.html`（systemctl）
- `https://www.kernel.org/doc/man-pages/`（man-pages 首页，仅作补充）
- `https://infozip.sourceforge.net/`（zip/unzip，仅作补充）

不允许：CSDN、掘金、博客园、简书、知乎、个人博客、AI 生成站。

## 7. 完成标准

1. 文件 JSON 合法，`node scripts/validate-commands.mjs` 输出 0 错误 0 警告；
2. 模块与命令清单完全对齐，无缺漏、无多余；
3. 每条至少 2 个示例、3 个真实选项、1 个真实坑、1–2 个白名单来源；
4. 每条都实际打开过 docs 里的链接（HTTP 200）；不确定的参数已删除；
5. 汇报时写清：条目数、模块数、抽查过的命令与链接、自检结果。