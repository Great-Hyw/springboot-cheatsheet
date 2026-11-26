===== git-clone | git clone | git-setup | 进阶
tagline: 把远程仓库完整拷到本地
plain: git clone 会把远程仓库的历史、分支和文件都复制到本地，并自动把源地址记成 origin。想省空间可以浅克隆只拉最近几次提交；只想跟一个分支就加 --single-branch，CI 里很常用。
syntax: git clone <repository> [<directory>]
keyPoints:
  - 克隆后自动建立 origin 远程和默认分支的跟踪关系
  - --depth 只拉最近若干次提交，适合 CI 或只看最新代码
  - --recurse-submodules 同时初始化并更新子模块
options:
  - --depth : 浅克隆，只拉取最近若干次提交
  - --branch : 只克隆指定分支，简写为 -b
  - --bare : 克隆成裸仓库，不带工作区
  - --recurse-submodules : 同时克隆并检出子模块
  - --single-branch : 只跟踪一个分支，配合 --depth 更省
examples:
  git clone https://github.com/spring-projects/spring-boot.git   // 克隆仓库到当前目录
  git clone --depth 1 https://github.com/spring-projects/spring-boot.git   // 浅克隆最近一次提交
  git clone -b 3.5.x https://github.com/spring-projects/spring-boot.git   // 克隆指定分支
pitfalls:
  - 浅克隆历史不完整，要看全量日志或变基前先 git fetch --unshallow
  - 仓库特别大时加 --depth 1，能省下大量时间和磁盘
related: git-init, git-remote, git-fetch
docs: git clone 官方文档 https://git-scm.com/docs/git-clone
tags: 克隆, 远程

===== git-help | git help | git-setup | 入门
tagline: 忘命令时查 Git 自带手册
plain: git help 打开的是 Git 自带的完整手册，比网上零散教程更权威。可以查指定命令，也可以列出所有命令、常见场景指南，或者直接在浏览器里打开 HTML 版文档。
syntax: git help [<command>]
keyPoints:
  - git help <命令> 打开该命令的完整手册，按 q 退出
  - -a 列出全部命令，-g 列出按场景组织的指南
  - -w 用浏览器打开 HTML 文档，-i 用 info 阅读器打开
options:
  - -a : 列出所有命令，包括外部命令
  - -g : 列出按场景组织的指南
  - -w : 在浏览器中打开 HTML 文档
  - -i : 在 info 阅读器中打开文档
examples:
  git help commit   // 查看 commit 的手册
  git help -a   // 列出全部命令
  git help -w status   // 浏览器打开 status 文档
pitfalls:
  - 手册里带尖括号的是占位符，照抄会报错，要换成真实参数
  - Windows 下 -w 需要配置浏览器，打不开就改用 git help <命令>
related: git-config, git-init
docs: git help 官方文档 https://git-scm.com/docs
tags: 帮助, 文档

===== git-status | git status | git-basic | 入门
tagline: 看当前工作区有哪些改动
plain: git status 是使用频率最高的命令之一：它告诉你当前在哪个分支、哪些文件已暂存、哪些改了没暂存、哪些是未跟踪的新文件。提交前先跑一遍，能避免漏提交或错提交。
syntax: git status [<pathspec>...]
keyPoints:
  - 输出分三块：已暂存、已修改未暂存、未跟踪文件
  - -s 用紧凑格式输出，脚本里处理更方便
  - -b 在短格式里也显示分支与领先落后信息
options:
  - -s : 短格式输出，一行一个文件
  - -b : 额外显示分支名和领先落后提交数
  - --porcelain : 机器可读的稳定格式，适合脚本解析
  - -u : 控制未跟踪文件的显示方式，-uno 表示隐藏
  - --ignored : 同时列出被 .gitignore 忽略的文件
examples:
  git status   // 查看当前状态
  git status -sb   // 紧凑格式并显示分支
  git status --ignored   // 列出被忽略的文件
pitfalls:
  - untracked files 不会自动提交，需要 git add 后才会进入暂存区
  - 在子目录里执行只显示该目录相关改动，排查全貌请回仓库根目录
related: git-add, git-commit, git-diff
docs: git status 官方文档 https://git-scm.com/docs/git-status
tags: 状态, 工作区

===== git-add | git add | git-basic | 入门
tagline: 把改动放进暂存区
plain: git add 决定下一次提交包含哪些改动：它把工作区的改动复制一份到暂存区（index）。可以整文件加、按目录加，也可以用 -p 逐个代码块确认，提交前精挑细选就靠它。
syntax: git add [<pathspec>...]
keyPoints:
  - add 之后改动进入暂存区，commit 只提交暂存区的内容
  - -p 交互式选择代码块，适合把一处改动拆成多次提交
  - -u 只加已跟踪文件的修改，不会误加新文件
options:
  - -p : 交互式选择要暂存的代码块
  - -u : 只暂存已跟踪文件的修改和删除
  - -A : 暂存所有改动，包括新文件与删除
  - -n : 试运行，只显示会加什么不真正执行
  - -f : 强制添加被 .gitignore 忽略的文件
examples:
  git add src/main/java/App.java   // 添加单个文件
  git add -A   // 添加全部改动
  git add -p   // 交互式挑代码块
pitfalls:
  - git add . 会把当前目录所有新文件都加进来，包括不该提交的临时文件
  - 已 add 的改动还能用 git restore --staged 撤出暂存区，不会丢内容
related: git-commit, git-status, git-restore
docs: git add 官方文档 https://git-scm.com/docs/git-add
tags: 暂存, 索引

===== git-branch | git branch | git-branch | 入门
tagline: 列出、创建和删除分支
plain: git branch 管理分支的目录：不带参数列出本地分支，带名字创建分支但不切换，-d 删除已合并的分支。注意它只负责增删查，真正切换分支要用 git switch。
syntax: git branch [<branchname>]
keyPoints:
  - 不带参数列出本地分支，当前分支前面有星号标记
  - git branch <name> 只创建不切换，切换分支用 git switch
  - -d 删除已合并分支，-D 强删未合并分支会丢提交
options:
  - -a : 列出本地和远程所有分支
  - -d : 删除已完全合并的分支
  - -D : 强制删除分支，未合并的提交会丢失
  - -m : 重命名当前分支
  - -vv : 显示每个分支的跟踪远程与领先落后数
  - --merged : 只列出已合并到当前分支的分支
examples:
  git branch   // 列出本地分支
  git branch feature/order   // 创建功能分支
  git branch -d feature/order   // 删除已合并分支
pitfalls:
  - -D 删除未合并分支会丢提交，删前先 git log --all 确认
  - 新手常以为 git branch 会切换分支，创建后记得再 switch
related: git-switch, git-merge, git-log
docs: git branch 官方文档 https://git-scm.com/docs/git-branch
tags: 分支, 管理

===== git-switch | git switch | git-branch | 入门
tagline: 切换分支或回到某个提交
plain: git switch 是从 git checkout 拆出来的分支切换命令，语义更清楚：切到已有分支、创建并切换新分支、或者临时回到某个提交。切换前有未提交改动时 Git 会拦下来，避免弄丢。
syntax: git switch <branch>
keyPoints:
  - git switch <分支> 切到已有分支，工作区文件会跟着更新
  - -c 创建并切换新分支，-C 会强制重建同名分支
  - --detach 进入游离 HEAD 状态，适合临时查看旧代码
options:
  - -c : 创建新分支并立即切换过去
  - -C : 类似 -c，但同名分支已存在时强制重置
  - --detach : 切到某个提交，进入游离 HEAD 状态
  - -t : 切换时设置上游跟踪分支
  - --orphan : 创建没有提交历史的新分支
  - -f : 丢弃工作区改动，强制切换
examples:
  git switch main   // 切到 main 分支
  git switch -c feature/order   // 创建并切到功能分支
  git switch --detach HEAD~2   // 临时查看旧提交
pitfalls:
  - 有未提交改动时切换可能报错，先 commit 或 stash 再切
  - -f 会丢弃工作区改动，确认不要了再用
related: git-branch, git-stash, git-merge
docs: git switch 官方文档 https://git-scm.com/docs/git-switch
tags: 分支, 切换

===== git-rebase | git rebase | git-branch | 进阶
tagline: 把提交搬到新基线，重写历史
plain: git rebase 把当前分支的提交逐个摘下来，接到目标分支最新提交之后，历史因此变成一条直线。它比 merge 更整洁，但会改写提交哈希，只适合还没推送的本地分支。
syntax: git rebase [<upstream>]
keyPoints:
  - rebase 改写提交哈希，已推送的分支别随便 rebase
  - -i 交互式整理提交，可合并、改说明、调整顺序
  - 冲突时解决后 git add，再 git rebase --continue
options:
  - -i : 交互式整理提交，可 squash、改说明、调顺序
  - --onto : 把一段提交搬到指定基线之上
  - --abort : 放弃变基，回到变基前状态
  - --continue : 解决冲突后继续变基
  - --skip : 跳过当前这个提交继续变基
  - --autosquash : 自动把 fixup 提交合并到目标提交
examples:
  git switch feature/order && git rebase main   // 变基到 main 最新提交
  git rebase -i HEAD~3   // 交互式整理最近三次提交
  git rebase --abort   // 变基冲突后放弃
pitfalls:
  - rebase 后再推送共享分支需要强推，会改写别人的历史，团队分支禁止这么做
  - 变基中把提交弄乱可以用 git reflog 找回原来的 HEAD
related: git-merge, git-cherry-pick, git-reflog
docs: git rebase 官方文档 https://git-scm.com/docs/git-rebase
tags: 变基, 历史

===== git-restore | git restore | git-undo | 入门
tagline: 把文件恢复到某个版本的样子
plain: git restore 负责恢复文件内容：把工作区改动撤掉、把已暂存的改动退回未暂存、或者把文件恢复到某个提交时的样子。它只管文件，不改提交历史，和 git reset 的分工不同。
syntax: git restore <pathspec>...
keyPoints:
  - 默认从暂存区恢复工作区文件，未暂存的改动会被丢弃
  - --staged 把文件退出暂存区，但保留工作区改动
  - --source 指定从哪个提交或分支取内容
options:
  - --staged : 把文件从暂存区退回，工作区内容保留
  - --worktree : 只恢复工作区文件，这是默认方向
  - --source : 指定从哪个提交或分支恢复
  - -p : 交互式选择要恢复的代码块
  - --ours : 冲突时保留当前分支版本
  - --theirs : 冲突时保留对方分支版本
examples:
  git restore README.md   // 撤销工作区里某个文件的改动
  git restore --staged src/App.java   // 把文件退出暂存区但保留改动
  git restore --source=HEAD~1 README.md   // 恢复成上一次提交的样子
pitfalls:
  - 默认恢复会直接丢弃工作区改动，且无法用 git 找回，先确认不需要了
  - 它只改文件不动提交，想撤销提交要用 reset 或 revert
related: git-reset, git-stash, git-status
docs: git restore 官方文档 https://git-scm.com/docs/git-restore
tags: 恢复, 撤销

===== git-stash | git stash | git-undo | 进阶
tagline: 临时收起未提交的改动
plain: git stash 把工作区和暂存区里还没提交的改动收起来，让目录回到干净状态，适合临时切分支救火。改动用 stash list 查看，git stash pop 恢复并删除，git stash apply 恢复但保留。
syntax: git stash [push|list|pop|apply|drop]
keyPoints:
  - 默认只收已跟踪文件的改动，新文件要加 -u 才一起收
  - pop 恢复并删除该条记录，apply 只恢复不删除
  - stash 是本地的临时栈，不会推送到远程
options:
  - -u : 连未跟踪的新文件一起收起
  - --keep-index : 收起时保留已暂存的改动
  - -p : 交互式选择要收起的代码块
  - --staged : 只收起已暂存的内容
  - -a : 连被忽略的文件也一起收起
examples:
  git stash   // 收起当前所有改动
  git stash -u   // 连新文件一起收起
  git stash pop   // 恢复最近一条并删除记录
pitfalls:
  - 不加 -u 时新建文件不会被收起，切分支后它们还留在工作区
  - stash 记录太多容易忘，用 git stash list 定期清理不需要的条目
related: git-restore, git-switch, git-status
docs: git stash 官方文档 https://git-scm.com/docs/git-stash
tags: 暂存, 切分支

===== git-rm | git rm | git-undo | 入门
tagline: 从版本库中删除文件
plain: git rm 把文件从版本库和工作区一起删掉，并把删除动作放进暂存区，下次提交时生效。只想停止跟踪、保留本地文件就用 --cached；删除目录要加 -r。
syntax: git rm <file>...
keyPoints:
  - 直接删文件和已跟踪记录，删除会进入暂存区等待提交
  - --cached 只停止跟踪，本地文件仍保留
  - 删目录加 -r，-f 强制删除有改动或已暂存的文件
options:
  - -r : 递归删除目录及其内容
  - --cached : 只从版本库移除，保留本地文件
  - -f : 强制删除有未提交改动或已暂存的文件
  - -n : 只预览会删除哪些文件
  - --ignore-unmatch : 文件不存在也不报错
examples:
  git rm old-config.yml   // 删除文件并暂存
  git rm --cached .env   // 停止跟踪但保留本地文件
  git rm -r logs   // 删除整个目录
pitfalls:
  - --cached 移除后文件会变成未跟踪状态，记得加进 .gitignore 否则还会被扫到
  - rm 只是删，想恢复要用 git restore --source 从历史里取回
related: git-restore, git-clean, git-add
docs: git rm 官方文档 https://git-scm.com/docs/git-rm
tags: 删除, 跟踪

===== git-blame | git blame | git-history | 入门
tagline: 看每一行最后是谁改的
plain: git blame 逐行显示文件内容，并在每行前面标出最后修改它的提交、作者和时间。排查某段代码为什么变成这样时很好用。-L 只看指定行范围，-C 能跨文件追踪复制来源。
syntax: git blame <file>
keyPoints:
  - 每行前面显示提交哈希、作者、时间和行号
  - -L 只看指定行区间，大文件里定位更快
  - -C 检测跨文件复制来的代码，追到真正的来源提交
options:
  - -L : 只标注指定行范围
  - -C : 检测同一文件或跨文件复制来的代码
  - -M : 检测文件内被移动或复制的代码
  - -w : 忽略空白字符差异
  - --ignore-rev : 忽略某次提交，常用于格式化提交
  - -s : 省略作者和时间，只保留摘要
examples:
  git blame src/App.java   // 查看整个文件的每行来源
  git blame -L 10,20 src/App.java   // 只看第 10 到 20 行
  git blame -C -C src/App.java   // 追踪跨文件复制的代码
pitfalls:
  - blame 显示的是最后一次改动的提交，不代表这行最初是谁写的
  - 大量格式化提交会显示成“罪魁祸首”，用 --ignore-rev 排除它们
related: git-log, git-show, git-bisect
docs: git blame 官方文档 https://git-scm.com/docs/git-blame
tags: 排查, 历史

===== git-reflog | git reflog | git-history | 进阶
tagline: 本地的 HEAD 变动记录
plain: git reflog 记录本地 HEAD 和分支指针的每一次移动，包括提交、reset、rebase、切换分支。误操作把提交弄丢时，可以从这里找到原来的哈希用 reset 恢复。它只存在本地，不会推送。
syntax: git reflog [show]
keyPoints:
  - 记录 HEAD 的每次移动，按时间倒序显示，用 HEAD@{n} 引用
  - 只在本机保存，克隆和推送都不会同步过去
  - 误 reset 或 rebase 后可用它找回原提交
options:
  - -n : 只显示最近 n 条记录
  - --all : 显示所有引用的变动记录
  - --expire : 清理过期记录，达到时间就删除
  - --expire-unreachable : 清理已不可达的过期记录
  - --dry-run : 只显示会清理什么，不实际删除
examples:
  git reflog   // 查看 HEAD 变动记录
  git reflog show --date=iso   // 查看带详细信息的记录
  git reset --hard HEAD@{3}   // 找回误删的提交
pitfalls:
  - reflog 会过期清理，找回提交要尽快，别等默认期限过了
  - 它只记本地操作，别人的 reset 或 rebase 在你这里看不到
related: git-reset, git-log, git-stash
docs: git reflog 官方文档 https://git-scm.com/docs/git-reflog
tags: 恢复, 排查

===== git-worktree | git worktree | git-history | 进阶
tagline: 一份仓库开多个工作目录
plain: git worktree 让同一个仓库同时拥有多个工作目录，各自检出不同分支，共享同一份 .git 数据。需要同时改两个分支又不想来回切换时很有用，省掉重复克隆的体积。
syntax: git worktree add <path> [<branch>]
keyPoints:
  - 多个工作区共享同一个 .git，切分支互不干扰
  - 同一分支不能同时检出到两个工作区
  - -b 新建分支并检出，remove 和 prune 负责清理
options:
  - -b : 创建新分支并检出到新工作区
  - -B : 创建或重置分支后检出
  - --detach : 以游离 HEAD 方式检出
  - --force : 强制检出，即使分支已被占用
  - --no-checkout : 只登记工作区，不检出文件
  - --porcelain : 以机器可读格式列出工作区
examples:
  git worktree add ../repo-release release/1.0   // 为发布分支开一个工作区
  git worktree add -b hotfix ../repo-hotfix main   // 新建分支并检出到新目录
  git worktree list   // 列出全部工作区
pitfalls:
  - 删目录前先 git worktree remove，否则仓库里会留下失效登记
  - 同一分支不能两个工作区同时检出，需要时用 --detach
related: git-branch, git-switch, git-clone
docs: git worktree 官方文档 https://git-scm.com/docs/git-worktree
tags: 工作区, 并行
