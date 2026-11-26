# 命令速查审计报告（自动生成 2026-11-26T14:25:21.831Z）

数据文件：3 个；命令条目：79 条；结论：**pass**

错误 0 / 存疑 0 / 建议 4；链接 80 个，失败 0

| 级别 | 问题码 | 文件 | id | 说明 |
| --- | --- | --- | --- | --- |
| 建议 | EXAMPLE_NOT_DEMONSTRATING_NAME | commands-linux-b.json | linux-pkill | examples[0].code 未直接演示「pkill」本身：「pgrep -a nginx」 |
| 建议 | EXAMPLE_NOT_DEMONSTRATING_NAME | commands-linux-b.json | linux-jobs | examples[2].code 未直接演示「jobs」本身：「bg %1」 |
| 建议 | EXAMPLE_NOT_DEMONSTRATING_NAME | commands-linux-b.json | linux-jobs | examples[3].code 未直接演示「jobs」本身：「fg %1」 |
| 建议 | LINKS_SKIPPED | - | - | 已按 --skip-links 跳过链接与 flag 真实性检查 |

抽查清单（34 条）：
- commands-linux-a.json / linux-chmod（chmod，linux-perm）
- commands-linux-a.json / linux-sed（sed，linux-text）
- commands-linux-a.json / linux-umask（umask，linux-perm）
- commands-linux-a.json / linux-find（find，linux-file）
- commands-linux-a.json / linux-mkdir（mkdir，linux-file）
- commands-linux-a.json / linux-cut（cut，linux-text）
- commands-linux-a.json / linux-pwd（pwd，linux-file）
- commands-linux-a.json / linux-cat（cat，linux-text）
- commands-linux-a.json / linux-less（less，linux-text）
- commands-linux-a.json / linux-sudo（sudo，linux-perm）
- commands-linux-a.json / linux-head（head，linux-text）
- commands-linux-b.json / linux-ping（ping，linux-network）
- commands-linux-b.json / linux-jobs（jobs，linux-process）
- commands-linux-b.json / linux-rsync（rsync，linux-network）
- commands-linux-b.json / linux-pkill（pkill，linux-process）
- commands-linux-b.json / linux-ip（ip，linux-network）
- commands-linux-b.json / linux-ss（ss，linux-network）
- commands-linux-b.json / linux-free（free，linux-process）
- commands-linux-b.json / linux-ps（ps，linux-process）
- commands-linux-b.json / linux-curl（curl，linux-network）
- commands-linux-b.json / linux-du（du，linux-disk）
- commands-git.json / git-rebase（git rebase，git-branch）
- commands-git.json / git-restore（git restore，git-undo）
- commands-git.json / git-reflog（git reflog，git-history）
- commands-git.json / git-switch（git switch，git-branch）
- commands-git.json / git-stash（git stash，git-undo）
- commands-git.json / git-worktree（git worktree，git-history）
- commands-git.json / git-blame（git blame，git-history）
- commands-git.json / git-add（git add，git-basic）
- commands-git.json / git-branch（git branch，git-branch）
- commands-git.json / git-status（git status，git-basic）
- commands-git.json / git-rm（git rm，git-undo）
- commands-git.json / git-help（git help，git-setup）
- commands-git.json / git-clone（git clone，git-setup）
