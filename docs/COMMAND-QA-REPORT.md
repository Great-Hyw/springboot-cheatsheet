# 命令模块（Linux / Git）QA 报告

- 任务：task-11 独立核查（verifier）
- 日期：2026-11-26（22:30 更新，含作者修复后复核）
- 范围：`src/data/commands-linux-a.json`（26 条）、`src/data/commands-linux-b.json`（23 条）、`src/data/commands-git.json`（30 条），共 79 条
- 规范：`docs/COMMAND-SPEC.md`；官方来源白名单：man7.org、gnu.org/software、git-scm.com/docs、man.openbsd.org、curl.se、rsync.samba.org、freedesktop.org、kernel.org、infozip.sourceforge.net
- 本报告只读 `src/data`，未修改任何数据文件；核查脚本与证据在 `tools/commands-audit/`

## 一、总体结论

**pass（可发布）**。结构/字段/真实 flag/链接/跨模块隔离的自动审计 0 错误；人工抽查（79 条全部通读、58 条深度核对）发现 4 条事实错误（linux-cp、linux-umask、git-fetch、linux-unzip），**均已由作者修复，并经本次逐条复核确认**；3 条建议（git-bisect 版本标注、git-switch、git-pull 措辞）也已修正核销。剩余 2 条存疑仅为本环境无法访问的官方链接（gnu.org），非内容错误，详见§五。

## 二、自动审计（tools/commands-audit/audit.mjs）

运行：

```bash
node tools/commands-audit/audit.mjs                 # 用本地链接缓存（TTL 7 天）
node tools/commands-audit/audit.mjs --refresh-links # 强制重抓全部官方文档
node tools/commands-audit/audit.mjs --skip-links    # 纯离线结构审计
```

最终结果（2026-11-26 22:29，数据为作者修复后版本）：

| 指标 | 结果 |
| --- | --- |
| 文件 / 条目 | 3 / 79（linux-a 26、linux-b 23、git 30） |
| 错误 | **0** |
| 存疑 | 2（均为本环境不可达链接，见§五） |
| 建议 | 4–7（随是否联网/缓存而异；均为 info 级） |
| 官方链接 | 80 个去重 URL；78 个 HTTP 200；2 个本环境不可达 |
| 抽样计划 | 34 / 79（43.0%） |

自动审计覆盖：JSON/字段/schema 与规范比对、id 与 §2 命令清单一一对应、模块与条目数量、level/tagline/plain/syntax/keyPoints/options/examples/pitfalls/related/tags 长度与数量、**options 中 flag 必须在对应官方文档页正文出现**、破坏性命令 pitfalls 必须写后果、Linux 条目不得出现 Git 概念（`\bgit\b`）且 Git 条目剥离 `git xxx` 后不得出现 Linux 命令词、id/name/plain 重复与近重复（3-gram Jaccard≥0.85）。

## 三、人工抽查

**79/79 条全部通读**，其中 **58 条深度核对**（34 条按 43% 抽样 + 24 条高风险 targeted：rm/cp/mv/find/sed/awk/tar/gzip/rsync/ssh/curl 与 git reset/restore/revert/fetch/pull/push/rebase/stash/worktree/reflog/bisect/--force-with-lease）。核对方式：逐条读 tagline/plain/keyPoints/options/examples/pitfalls/docs，对照官方 man page / git-scm docs / GNU 手册原文，不凭记忆断言。

| 文件 | 模块 | 深度核对 / 条目 | 说明 |
| --- | --- | --- | --- |
| commands-linux-a | linux-file | 8/10 | 抽样 find/mkdir/pwd + targeted rm/cp/mv/touch/ln |
| commands-linux-a | linux-text | 9/10 | 抽样 cat/less/head/cut/sed + targeted tail/grep/sort/awk |
| commands-linux-a | linux-perm | 4/6 | 抽样 chmod/umask/sudo + targeted chown |
| commands-linux-b | linux-process | 6/9 | 抽样 ps/pkill/jobs/free + top/kill |
| commands-linux-b | linux-network | 7/8 | 抽样 ping/ip/curl/ss/rsync + ssh/scp |
| commands-linux-b | linux-disk | 5/6 | 抽样 du + tar/gzip/df/zip |
| commands-git | git-setup | 4/4 | clone/help/config/init |
| commands-git | git-basic | 5/6 | status/add/commit/diff/log |
| commands-git | git-branch | 4/5 | branch/switch/rebase/merge |
| commands-git | git-remote | 4/4 | fetch/pull/push/remote |
| commands-git | git-undo | 6/6 | restore/reset/revert/stash/clean/rm |
| commands-git | git-history | 5/5 | blame/reflog/worktree/bisect/tag |

抽样清单可复现：`node tools/commands-audit/audit.mjs` 后见 `tools/commands-audit/report.json` 的 `sample` 字段；逐条摘录在 `tools/commands-audit/review/*.review.md`。

## 四、问题清单（全部已修复并复核）

### E1【已修复·已复核】commands-linux-a.json / linux-cp — `-r` 对符号链接的行为写反

- 原文：keyPoints「-r 递归复制目录，普通 -r 会跟随符号链接复制内容」；pitfalls「-r 会跟随符号链接，备份时可能把链接指向的内容也拷进来」。
- 问题：GNU cp 的 `-r/-R` 默认**不跟随**符号链接（复制链接本身），跟随需 `-L`。
- 证据：GNU coreutils 9.1 官方手册 cp invocation 节：“Copy directories recursively. By default, do not follow symbolic links in the source unless used together with the `--link (-l)` option; see the `--archive (-a)`, `-d`, `--dereference (-L)`, `--no-dereference (-P)`, and `-H` options. … On some non-GNU systems, `-r` implies the equivalent of `-L` …” https://sources.debian.org/data/main/c/coreutils/9.1-1/doc/coreutils.texi
- 复核：现 keyPoints「-r 递归复制目录；默认复制符号链接本身（-P 显式保持不跟随），-L 才跟随」，pitfall「默认复制的是链接本身；加 -L 才会跟随链接，备份时别误用」。正确。

### E2【已修复·已复核】commands-linux-a.json / linux-umask — sudo 会继承调用者 umask

- 原文：pitfalls「umask 只对当前 shell 生效，另开终端或用 sudo 都不继承」。
- 问题：sudo 默认沿用调用者 umask（sudoers 的 umask 实际取「用户 umask 与 sudoers 值的并集」，保证 sudo 不会放宽权限）。
- 证据：sudoers(5)：“Unless the `umask_override` flag is set, the actual umask will be the union of the user's umask and the value of the umask setting, which defaults to 0022. This guarantees that sudo never lowers the umask when running a command. If umask is not set in sudoers, the umask specified by PAM or login.conf will take precedence.” https://man7.org/linux/man-pages/man5/sudoers.5.html
- 复核：pitfall 现为「只影响当前 shell 及子进程；sudo 默认沿用你的 umask，除非 sudoers 里收紧」，keyPoints 同步；不规范的组合 options `-pS` 已删除，保留 `-S`/`-p`，规范已加 linux-umask 的 2 条 options 白名单（`docs/COMMAND-SPEC.md` 第 110 行、`scripts/validate-commands.mjs` 的 `MIN_OPTIONS`），审计脚本同步加入该例外。正确。

### E3【已修复·已复核】commands-git.json / git-fetch — 「强推后 fetch 会拒绝更新」不成立

- 原文：pitfalls「远程分支被强推后 fetch 会拒绝更新，确认无误再用 --force」。
- 问题：git fetch 默认 refspec 为 `+refs/heads/*:refs/remotes/origin/*`（`+` 即允许非快进），强推后 fetch 会直接更新远程跟踪分支并成功；只有把 ref 拉进**本地分支**且 refspec 未加 `+` 时才会拒绝。
- 证据：git-fetch 官方文档对 `+<refspec>` 与 `--force` 的说明 https://git-scm.com/docs/git-fetch ；本地可复现：裸仓库强推后于另一克隆执行 `git fetch origin`，输出 `fe0b61a..710ccdc main -> origin/main`，退出码 0。
- 复核：pitfall 现为「远程分支被强推后，默认 refspec 带 +，fetch 会直接更新跟踪分支，不需要 --force」。正确。

### E4【已修复·已复核】commands-linux-b.json / linux-unzip — `-O GBK` 不是 Info-ZIP unzip 的选项

- 原文：plain「Windows 打的包含 GBK 文件名时，加 -O GBK 避免中文乱码」；keyPoints 第 4 条同义；options 含 `{"flag":"-O","desc":"指定文件名编码，如 -O GBK"}`。
- 问题：Info-ZIP unzip 6.0 没有 `-O` 选项；主流发行版（Debian/Ubuntu/Arch，均打包 unzip 6.0）会报 invalid option。证据：Debian unzip 6.0 源码 `unzip.c` 的选项 switch 无 `case 'O'`（https://sources.debian.org/data/main/u/unzip/6.0-26+deb11u1/unzip.c ）；Debian/Ubuntu/Arch 的 man page 与 Info-ZIP 官方 UnZip.html 均无 `-O`；本机 Info-ZIP 6.00 实测 `unzip -O GBK x.zip` 直接打印 usage。
- 复核：`-O` 选项已删除（现 options 为 -l/-d/-o/-n/-q 五条，全部真实）；plain/keyPoints/pitfalls 已改为「unzip 6.0 不能指定文件名编码，GBK 文件名包可能乱码，需用支持编码转换的工具处理」，不再给出不存在的 flag。正确。

### 建议级（全部已核销）

| # | 文件 / id | 问题 | 处理结果 |
| --- | --- | --- | --- |
| S1 | commands-git.json / git-bisect | options 含 `--reset-when-found`，本机 git 2.53.0 不支持（官方最新文档已收录，属很新特性） | 已在 option desc 注明「需较新 Git 版本」 |
| S2 | commands-git.json / git-switch | plain「有未提交改动时 Git 会拦下来」略绝对 | 已改为「改动与目标分支冲突时 Git 会拒绝切换」 |
| S3 | commands-git.json / git-pull | pitfalls「本地有未提交改动时 pull 会报错」略绝对 | 已改为「本地改动与拉取内容冲突时，pull 会中止并要求先处理改动」 |
| S4 | commands-linux-b.json / zip、unzip | docs 选用 Info-ZIP 介绍页，不含选项表 | 保留（官方页面，可接受）；flag 已由人工 man page 核对 |

## 五、局限与说明

1. 本机无法访问 `www.gnu.org`（DNS 解析失败），curl 与 web_fetch 均失败：`https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html`（linux-jobs 文档）与 `https://www.gnu.org/software/gzip/manual/html_node/Invoking-gzip.html`（linux-gzip 文档）2 条链接无法自动验证，脚本降级为 `LINK_UNVERIFIABLE`（存疑）而非内容错误；相关命令已用其他官方文本人工核对。这不是内容错误，换网络环境复跑 `node tools/commands-audit/audit.mjs --refresh-links` 即可确认。
2. 本机环境为 Git Bash（GNU coreutils 8.32 / unzip 6.00 / git 2.53.0.windows.2），Windows 上 `ln -s` 退化为复制、无法实测符号链接行为，因此 cp 的结论以官方 GNU 手册原文为准，未凭本机行为下判断；`zip` 命令本机未安装，其选项按 Info-ZIP 官方文档核对。
3. 页面接入（http://127.0.0.1:4173 的 /commands/linux、/commands/git）未在浏览器中人工走查，本次结论仅针对数据内容；渲染层如需核查请另行安排。
4. 自动审计抓不到「语义写反/说法错误」类问题（E1–E4 均属此类），这类只能靠人工抽查。E1–E4 修复文案已逐条复读复核。

## 六、复跑命令

```bash
# 数据校验（Lead 的脚本）
node scripts/validate-commands.mjs

# 独立审计（结构 + 链接 + flag 真实性 + 跨模块隔离 + 抽样）
node tools/commands-audit/audit.mjs
node tools/commands-audit/audit.mjs --refresh-links   # 强制重抓官方文档
node tools/commands-audit/audit.mjs --skip-links      # 纯离线

# 报告与人工核查材料
tools/commands-audit/report.json      # 机器可读结果
tools/commands-audit/report.md        # 摘要
tools/commands-audit/review/          # 抽样条目全文摘录
```

## 七、证据链接汇总

- GNU coreutils 手册（cp -r 符号链接语义）：https://sources.debian.org/data/main/c/coreutils/9.1-1/doc/coreutils.texi
- sudoers(5)（sudo 与 umask）：https://man7.org/linux/man-pages/man5/sudoers.5.html
- git-fetch（`+<refspec>` / `--force`）：https://git-scm.com/docs/git-fetch
- git-bisect（`--reset-when-found`）：https://git-scm.com/docs/git-bisect
- Info-ZIP unzip 6.0 源码（无 `-O` 选项）：https://sources.debian.org/data/main/u/unzip/6.0-26+deb11u1/unzip.c
- Info-ZIP 官方 UnZip 页：https://infozip.sourceforge.net/UnZip.html
- 其余抽查依据：`tools/commands-audit/.cache/pages/*.txt`（每个官方页面抓取后的纯文本，含 SOURCE 头）与 `tools/commands-audit/.cache/links.json`（URL→HTTP 状态）