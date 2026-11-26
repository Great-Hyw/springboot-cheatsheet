===== linux-rm | rm | linux-file | 入门
tagline: 删除文件或目录
plain: 清理临时文件、删掉旧日志时用它。rm 默认只删文件，删目录要加 -r；-f 表示强制不提示。删除后没有回收站，敲回车之前一定先确认路径对不对。
syntax: rm [选项] 文件或目录...
keyPoints:
  - 删空目录可以用 rm -d，删非空目录必须加 -r
  - -i 每个文件都问一次，-f 则完全不问，常和 -r 一起写
  - 多个文件或通配符由 shell 展开，rm *.log 会删掉所有日志
  - 删除结果不会进回收站，也没有撤销命令
options:
  - -r : 递归删除目录和里面的所有内容
  - -f : 强制删除，忽略不存在的文件且不提示
  - -i : 删除前逐个确认
  - -d : 删除空目录，作用等同 rmdir
  - --preserve-root : 拒绝删除根目录 /，默认开启
examples:
  rm -rf ./build   // 删除构建产物目录
  rm -i *.log   // 删除日志前逐个确认
  rm -d old-empty-dir   // 删除空目录
pitfalls:
  - rm -rf 不进回收站，删错只能靠备份恢复，执行前先用 ls 确认路径
  - 目录变量为空时 rm -rf $DIR/* 可能变成删根目录，脚本里先判断变量
docs: https://man7.org/linux/man-pages/man1/rm.1.html

===== linux-cp | cp | linux-file | 进阶
tagline: 复制文件或目录
plain: 备份配置、把文件拷到别的目录时用它。cp 默认只复制单个文件，复制目录要加 -r；想连权限和时间戳一起保留就用 -a，这是备份场景最稳的写法。
syntax: cp [选项] 源文件... 目标
keyPoints:
  - 目标不存在就新建；目标已是目录时文件被复制进该目录
  - -a 等于 -dR --preserve=all，保留权限、属主、时间戳和链接
  - -i 覆盖前询问，-n 已存在就跳过，-u 只在源更新时覆盖
  - -r 递归复制目录，普通 -r 会跟随符号链接复制内容
options:
  - -r : 递归复制整个目录
  - -a : 归档模式，保留权限、属主、时间戳和链接
  - -i : 覆盖已有文件前先询问
  - -n : 目标已存在时不覆盖
  - -u : 只在源文件更新时覆盖目标
  - -p : 保留权限、属主和时间戳
  - -v : 显示复制了哪些文件
examples:
  cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak   // 备份一份配置
  cp -a /etc/nginx /var/backups/nginx-2026   // 整个目录连权限一起复制
  cp -u app.jar /opt/app/app.jar   // 只在源更新时覆盖目标
pitfalls:
  - cp 覆盖同名文件默认不提示，重要文件先备份或加 -i
  - -r 会跟随符号链接，备份时可能把链接指向的内容也拷进来
docs: https://man7.org/linux/man-pages/man1/cp.1.html

===== linux-mv | mv | linux-file | 入门
tagline: 移动或重命名文件和目录
plain: 整理目录、给文件改名时用它。mv 不是复制，源文件会直接出现在新位置；同一目录内 mv 就是改名，跨目录就是移动，目标有同名文件时默认不提示就覆盖。
syntax: mv [选项] 源文件... 目标
keyPoints:
  - 同一目录 mv a.txt b.txt 是改名，跨目录是移动
  - 目标已存在默认直接覆盖，-i 覆盖前问，-n 完全不覆盖
  - 跨文件系统移动会先复制再删除，大文件会明显变慢
  - -v 打印移动过程，-u 只在源比目标新时才移动
options:
  - -i : 覆盖已有文件前询问
  - -n : 目标已存在时不做任何操作
  - -f : 直接覆盖，不询问（默认行为）
  - -v : 显示移动了哪些文件
  - -u : 只在源文件比目标新时才移动
examples:
  mv nginx.conf nginx.conf.bak   // 给配置文件加备份后缀
  mv /data/app /backup/app   // 把整个目录移到备份盘
  mv *.log /var/log/archive/   // 把多个日志移到归档目录
pitfalls:
  - mv 覆盖后原文件就没了，目标有同名文件时先确认再执行
  - 目标目录不存在时 mv a b 只是把 a 改名成 b，容易误判成移动
  - 正在被进程打开的文件也能移动，程序会找不到原来的路径
docs: https://man7.org/linux/man-pages/man1/mv.1.html

===== linux-touch | touch | linux-file | 入门
tagline: 创建空文件或更新文件时间
plain: 要快速建一个空占位文件、或让构建工具以为文件刚改过时用它。touch 在文件不存在时建空文件，存在时只把访问和修改时间刷成当前时间，文件内容不动。
syntax: touch [选项] 文件...
keyPoints:
  - 文件不存在就建空文件，已存在只更新时间、不改内容
  - -a 只改访问时间，-m 只改修改时间，都不写默认改两个
  - -d 指定时间：touch -d '2026-01-01 08:00' app.log
  - -c 文件不存在时不新建，只更新已有文件
options:
  - -a : 只更新访问时间（atime）
  - -m : 只更新修改时间（mtime）
  - -c : 文件不存在时不创建
  - -d : 用给定日期时间代替当前时间
  - -t : 用 [[CC]YY]MMDDhhmm 格式指定时间
  - -r : 用参考文件的时间来设置
examples:
  touch app.log   // 建一个空日志文件
  touch -d '2026-01-01 08:00' app.log   // 把时间改成指定日期
  touch -m app.log   // 只更新修改时间
pitfalls:
  - touch 会让构建工具认为文件刚改过，可能触发不必要的重编译
  - 新建文件需要对目录有写权限，改已有文件时间还得有该文件的写权限
docs: https://man7.org/linux/man-pages/man1/touch.1.html

===== linux-ln | ln | linux-file | 进阶
tagline: 创建硬链接或符号链接
plain: 想让多个路径指向同一份文件、或给常用目录做个快捷方式时用它。ln 默认建硬链接，加 -s 建符号链接；日常用软链接更多，源路径写错就会变成断链。
syntax: ln [选项] 目标 链接名
keyPoints:
  - ln -s 源 链接名 建软链接，源可以是文件、目录或别的分区路径
  - 不加 -s 是硬链接，只能指向同分区文件，删掉一个另一个还在
  - 软链接里存的是路径字符串，源被删掉链接就失效
  - -r 生成相对路径的软链接，适合打包后整体迁移
options:
  - -s : 创建符号链接（软链接）
  - -f : 链接名已存在时先删除再创建
  - -n : 链接名是目录软链接时按普通文件处理
  - -r : 创建相对路径的符号链接
  - -v : 打印每个创建的链接
examples:
  ln -s /var/log/nginx ~/nginx-logs   // 给日志目录做个快捷方式
  ln -sr /opt/app/config ./config   // 建相对路径软链接
  ln -sf /opt/app/app-v2.jar ./app.jar   // 强制覆盖已有链接
pitfalls:
  - 软链接源建议写绝对路径，相对路径是按链接所在目录解析的
  - 删软链接用 rm 链接名，写成 rm 链接名/ 可能删到目标目录里的内容
  - 硬链接不能跨分区，普通用户也不能拿它给目录建链接
docs: https://man7.org/linux/man-pages/man1/ln.1.html

===== linux-tail | tail | linux-text | 进阶
tagline: 看文件末尾并实时跟踪
plain: 查线上问题最常用的就是 tail -f 盯着日志。tail 默认打印最后 10 行，-f 会持续输出新写入的内容，-n 可以先看最近几十行再继续跟踪。
syntax: tail [选项] [文件...]
keyPoints:
  - 默认最后 10 行，tail -n 100 文件 看最近 100 行
  - -f 持续跟踪文件新增内容，Ctrl+C 结束
  - -F 在文件被切割或重建后自动重新打开，比 -f 稳
  - -n +100 表示从第 100 行开始一直输出到末尾
options:
  - -n : 指定显示最后多少行，如 -n 50
  - -f : 跟踪文件增长，实时输出新内容
  - -F : 同 -f，但文件被替换后自动重新打开
  - -c : 按字节数显示末尾内容
  - --pid : 跟踪的进程结束后自动退出
examples:
  tail -f /var/log/app/app.log   // 实时跟踪应用日志
  tail -n 200 -f /var/log/nginx/error.log   // 先看最近 200 行再跟踪
  tail -F /var/log/syslog   // 日志被切割后仍持续跟踪
pitfalls:
  - -f 跟的是文件句柄，日志被切割后可能不再有新内容，改用 -F
  - tail -f 不会自己退出，脚本里用要配 timeout 或 --pid
docs: https://man7.org/linux/man-pages/man1/tail.1.html

===== linux-grep | grep | linux-text | 入门
tagline: 按关键字搜索文件内容
plain: 日志里找报错、代码里找某个函数时用它。grep 逐行匹配关键字并打印命中的行，-r 递归搜整个目录，-i 忽略大小写，是最常用的排查工具之一。
syntax: grep [选项] 模式 [文件...]
keyPoints:
  - grep error app.log 打印包含 error 的行
  - -r 递归搜目录，-n 显示行号，-i 忽略大小写
  - -v 反向匹配，用来排除含关键字的行
  - -E 用扩展正则，-l 只输出匹配的文件名
  - 模式含特殊字符要加引号，如 'error|fail'
options:
  - -i : 匹配时忽略大小写
  - -r : 递归搜索目录下的文件
  - -n : 在结果前显示行号
  - -v : 反向匹配，输出不含关键字的行
  - -E : 使用扩展正则表达式
  - -l : 只列出匹配的文件名
  - -c : 只输出匹配的行数
examples:
  grep -n 'ERROR' /var/log/app/app.log   // 在日志里找报错行
  grep -rn 'TODO' ./src   // 递归搜代码里的 TODO
  grep -v '^#' /etc/ssh/sshd_config   // 排除配置里的注释行
pitfalls:
  - 关键词不加引号时 shell 会先解释通配符或管道，模式要用单引号
  - grep 只按行匹配，跨行内容搜不到，要看上下文加 -A/-B
  - 递归搜 / 很慢还会刷权限错误，先限定到具体目录
docs: https://man7.org/linux/man-pages/man1/grep.1.html

===== linux-sort | sort | linux-text | 入门
tagline: 按列或数值给文本行排序
plain: 统计访问量前几名、把日志按时间排开时用它。sort 默认按整行字符排序，-n 按数值、-k 指定第几列、-t 指定分隔符，常配合 uniq 统计重复次数。
syntax: sort [选项] [文件...]
keyPoints:
  - 默认按整行字典序排，加 -r 变成从大到小
  - -n 按数值排，-h 按 2K、1G 这类人类可读大小排
  - -k 2,2 按第二列排，-t : 指定冒号作分隔符
  - sort file | uniq -c 数重复，前提是先排好序
options:
  - -n : 按数值大小排序
  - -r : 逆序排列，从大到小
  - -k : 指定按哪一列排序，如 -k 2,2
  - -t : 指定字段分隔符，如 -t :
  - -u : 排序后顺便去重
  - -h : 按人类可读大小排序，如 2K、1G
  - -f : 排序时忽略大小写
examples:
  sort -nr access_count.txt   // 按访问次数从多到少排
  sort -t : -k 2,2n /etc/passwd   // 按第二列数值排序
  sort access.log | uniq -c | sort -nr   // 统计每行出现次数并排序
pitfalls:
  - 不先 sort 就用 uniq 统计，会漏掉不相邻的重复行
  - 数字列不加 -n 会按字符排，10 会排在 2 前面
  - 排序结果受本地化设置影响，脚本里可加 LC_ALL=C 保证稳定
docs: https://man7.org/linux/man-pages/man1/sort.1.html

===== linux-awk | awk | linux-text | 进阶
tagline: 按列处理文本并做统计
plain: 要从日志里按列取数据、求和求平均时用它。awk 逐行读取、按分隔符拆列，$1 表示第一列，还能写 if 和累加做统计，比 cut 灵活得多，适合一次性分析。
syntax: awk [选项] '程序' [文件...]
keyPoints:
  - $1 是第一列，$NF 是最后一列，$0 是整行内容
  - 默认按空格和制表符分列，-F : 可指定分隔符
  - awk '{sum+=$3} END {print sum}' 对第三列求和
  - -v 把外部变量传进程序，如 -v n=10
  - 内置变量 NR 是当前行号，NF 是当前行的列数
options:
  - -F : 指定字段分隔符，如 -F :
  - -v : 定义变量并传进 awk 程序
  - -f : 从文件读取 awk 程序
examples:
  awk '{print $1}' access.log   // 打印每行第一列
  awk -F: '{print $1}' /etc/passwd   // 按冒号分列取用户名
  awk '{sum+=$3} END {print sum}' data.txt   // 统计第三列的总和
  awk '{print NR, $0}' app.log   // 打印行号和内容
pitfalls:
  - awk 程序要用单引号包住，否则 $1 会被 shell 当成变量展开
  - 指定 -F 后连续分隔符会产生空字段，字段编号可能和想的不同
docs: https://man7.org/linux/man-pages/man1/gawk.1.html | https://man7.org/linux/man-pages/man1/awk.1p.html

===== linux-chown | chown | linux-perm | 进阶
tagline: 修改文件或目录的属主和属组
plain: 文件被别人占了、部署后属主不对导致服务读不到时用它。chown 把文件所有者改成指定用户，冒号后面还能同时改组，-R 递归处理整个目录。
syntax: chown [选项] 用户[:组] 文件...
keyPoints:
  - chown user file 只改属主，chown user:group file 一起改
  - chown :group file 只改属组，chgrp 也能做同样的改属组
  - -R 递归修改目录及里面所有内容的属主和属组
  - 普通用户只能改自己文件的属组，改属主通常需要 root
options:
  - -R : 递归修改目录下所有内容
  - -v : 显示处理过的每个文件
  - -c : 只显示真正发生变化的文件
  - --reference : 照另一个文件的属主和属组设置
  - -h : 修改符号链接本身而不是它指向的文件
examples:
  chown -R deploy:deploy /opt/app   // 把应用目录交给 deploy 用户
  chown :www-data /var/www/html/index.html   // 只改属组
  chown --reference=/opt/app/config.yml /opt/app/app.yml   // 照另一个文件的属主设置
pitfalls:
  - chown -R 会把整个目录树的属主都换掉，执行前确认路径
  - 对系统目录乱改属主可能让服务起不来，如 /var/lib/mysql
  - 符号链接默认改的是它指向的文件，要改链接本身加 -h
docs: https://man7.org/linux/man-pages/man1/chown.1.html

===== linux-ssh | ssh | linux-network | 进阶
tagline: 远程登录另一台机器
plain: ssh 登录远程主机执行命令，也能通过 -L 做本地端口转发。常用 -p 指定端口、-i 指定私钥、-v 打印握手过程排查连不上。免密登录要先 ssh-copy-id 把公钥放到对方 authorized_keys，并保证目录和文件权限正确。
syntax: ssh [选项] 用户名@主机
keyPoints:
  - -p 指定端口，-i 指定私钥，-v 打印调试信息。
  - -L 把本地端口转发到远端，-N 只建隧道不执行命令。
  - 首次连接会记录主机指纹，之后变了会告警。
  - 免密登录要先把公钥装到对方 authorized_keys。
options:
  - -p : 指定远端 SSH 端口
  - -i : 指定登录用的私钥文件
  - -v : 打印调试信息，可叠加 -vv 看更多
  - -L : 本地端口转发，如 -L 8080:localhost:80
  - -N : 只建立连接，不执行远程命令
  - -o : 传入配置项，如 -o StrictHostKeyChecking=no
examples:
  ssh -p 2222 -i ~/.ssh/id_ed25519 deploy@10.0.0.5   // 用指定端口和私钥登录
  ssh -L 8080:localhost:80 deploy@10.0.0.5   // 本地 8080 转发到远端 80
  ssh -N -L 3306:db.internal:3306 jump@10.0.0.5   // 只建隧道不执行命令
  ssh -vv deploy@10.0.0.5   // 排查连接失败原因
pitfalls:
  - 主机重装后报 REMOTE HOST IDENTIFICATION HAS CHANGED，先确认是不是自己换的机器。
  - 私钥权限过宽会被拒绝，chmod 600 私钥、700 ~/.ssh 再连。
docs: https://man.openbsd.org/ssh.1

===== linux-tar | tar | linux-disk | 进阶
tagline: 打包和解包归档文件
plain: tar 把一堆文件打成一个归档，常配合 gzip 用：tar -czf 打包，tar -xzf 解包，tar -tzf 只看清单不解压。注意 -f 后面必须紧跟归档文件名，选项顺序写错会被当成文件名。解压会覆盖同名文件，动手前先 -t 看一眼内容。
syntax: tar [选项] 归档文件 [文件...]
keyPoints:
  - -c 创建归档，-x 解压，-t 只列清单。
  - -z 表示用 gzip 压缩或解压，-f 指定归档文件名。
  - -C 先切换到指定目录再打包或解压，适合指定落点。
  - 解压会覆盖同名文件，先 tar -tzf 看清单再动手。
options:
  - -c : 创建归档文件
  - -x : 从归档里解压
  - -t : 列出归档内容，不解压
  - -z : 用 gzip 压缩或解压
  - -f : 指定归档文件名，后面要紧跟文件名
  - -v : 显示正在处理的文件
  - -C : 处理前切换到指定目录
  - --exclude : 打包时排除匹配的文件
examples:
  tar -czf logs.tar.gz /var/log/app   // 把目录打包成 gz
  tar -tzf logs.tar.gz   // 看包里的文件清单
  tar -xzf logs.tar.gz -C /opt/restore   // 解压到指定目录
  tar -czf app.tar.gz --exclude='*.log' app/   // 打包时排除日志文件
pitfalls:
  - -f 后面必须紧跟归档文件名，选项顺序写错会把文件名当选项。
  - 解压默认覆盖同名文件，动手前先 tar -tzf 看清单。
docs: https://man7.org/linux/man-pages/man1/tar.1.html

===== linux-gzip | gzip | linux-disk | 入门
tagline: 压缩单个文件
plain: gzip 把单个文件压成 .gz，默认原地替换并删掉原文件，要保留原文件加 -k。它不能一次压多个文件成一个包，多文件先用 tar 打包。解压用 gzip -d 或 gunzip，看压缩比用 -l，压缩级别 -1 到 -9，默认 -6。
syntax: gzip [选项] 文件...
keyPoints:
  - 默认原地替换并删掉原文件，要保留加 -k。
  - 只能压单个文件，多文件先 tar 打包再压。
  - -d 解压，等价于用 gunzip；-l 看压缩比。
  - -1 到 -9 调压缩级别，默认 -6，越高越慢。
options:
  - -d : 解压 .gz 文件
  - -k : 保留原文件，不删除
  - -9 : 最高压缩级别，1 到 9 可调
  - -l : 列出压缩前后大小和压缩比
  - -c : 结果写到标准输出，不改动原文件
  - -r : 递归处理目录下的所有文件
examples:
  gzip -k access.log   // 压缩单个文件，保留原文件
  gzip -d access.log.gz   // 解压 .gz 文件
  gzip -l access.log.gz   // 看压缩比
  gzip -9 big.sql   // 最高级别压缩
pitfalls:
  - gzip 默认原地替换并删掉原文件，要保留记得加 -k。
  - gzip 只能压单个文件，把多个文件打成一个包要用 tar。
docs: https://www.gnu.org/software/gzip/manual/html_node/Invoking-gzip.html

===== git-commit | git commit | git-basic | 入门
tagline: 把暂存区保存成一次提交
plain: commit 把暂存区的内容固化成一次提交，写进本地历史。每次提交要有清晰说明：改了什么、为什么改。用 -m 直接在命令行写说明，配合 -a 可以跳过 add 提交已跟踪文件的修改。
syntax: git commit [-m <message>]
keyPoints:
  - 一次提交对应一个逻辑改动，说明写清动机而不是罗列文件
  - -a 只对已跟踪文件生效，新文件仍需先 add
  - --amend 修改最近一次提交，会改写历史，已推送的分支慎用
options:
  - -m : 直接给出提交说明，不用打开编辑器
  - -a : 自动暂存已跟踪文件的修改后再提交
  - --amend : 改写最近一次提交的内容或说明
  - -v : 提交时显示改动 diff，方便检查
  - --no-verify : 跳过 pre-commit 等钩子检查
examples:
  git commit -m "fix: 修复订单金额计算错误"   // 提交暂存区并写说明
  git commit -am "chore: 更新依赖版本"   // 跳过 add 直接提交已跟踪改动
  git commit --amend -m "fix: 修正提交说明"   // 修改最近一次提交说明
pitfalls:
  - 提交前没 add 新文件，commit 后会发现文件还是未跟踪状态
  - 对已推送的提交做 --amend 会让本地和远程历史分叉，需要强推同步
docs: https://git-scm.com/docs/git-commit

===== git-diff | git diff | git-basic | 进阶
tagline: 对比工作区、暂存区与提交
plain: git diff 用来回答到底改了什么。默认对比工作区和暂存区；加 --cached 看暂存区与上次提交的差异；给两个提交号则对比任意两次提交。提交前扫一眼 diff 是最有效的自检。
syntax: git diff [<commit>] [<commit>]
keyPoints:
  - 不带参数：工作区 vs 暂存区，即还没 add 的改动
  - --cached 看已暂存、即将被提交的内容
  - git diff A B 对比两次提交，git diff HEAD 对比工作区与最新提交
options:
  - --cached : 对比暂存区与最近一次提交
  - --stat : 只显示改了哪些文件及行数统计
  - --name-only : 只列出改动的文件名
  - --word-diff : 按单词粒度显示差异，适合改文案
  - --no-index : 对比两个普通文件，不需要仓库
examples:
  git diff   // 看还没暂存的改动
  git diff --cached   // 看将要提交的内容
  git diff HEAD~2 HEAD   // 对比两个提交
pitfalls:
  - 直接 git diff 看不到已 add 的内容，别误以为改动丢了
  - 大文件或二进制文件 diff 输出很难读，用 --stat 先看概况
docs: https://git-scm.com/docs/git-diff

===== git-log | git log | git-basic | 入门
tagline: 翻看提交历史
plain: git log 按时间倒序列出提交历史。默认输出很啰嗦，日常用 --oneline 一行一条，加 --graph 看分支合并关系。找问题时可以按作者、时间过滤，快速定位是哪次提交引入的改动。
syntax: git log [<options>] [<path>...]
keyPoints:
  - --oneline 一行一条，配 --graph 能看清分支分叉
  - -n 限制条数，--since 按时间过滤，--author 按作者过滤
  - --all 显示所有分支的提交，而不只是当前分支
options:
  - --oneline : 每个提交压缩成一行显示
  - --graph : 在左侧画出提交与分支的连线
  - -n : 只显示最近 n 条提交
  - --since : 只显示指定时间之后的提交
  - --author : 只显示指定作者的提交
  - --all : 显示所有分支的提交
examples:
  git log --oneline -10   // 紧凑查看最近历史
  git log --oneline --graph --all   // 带分支图看全部历史
  git log --author="Zhang San" --since="2 weeks ago"   // 按作者和时间过滤
pitfalls:
  - 默认只显示当前分支，切到别的分支就看不到，排查时加 --all
  - 历史太长会刷屏，进分页后按 q 退出、按 / 搜索
docs: https://git-scm.com/docs/git-log

===== git-merge | git merge | git-branch | 进阶
tagline: 把另一条分支合并进来
plain: git merge 把指定分支的历史合并到当前分支。两个分支都有新提交时会产生一个合并提交；如果当前分支可以直接快进，默认只移动指针。合并冲突要手动解决后 add 再 commit。
syntax: git merge <branch>
keyPoints:
  - 先切到目标分支，再 git merge 要合并进来的分支
  - 默认能快进就快进，--no-ff 强制生成合并提交保留分叉
  - 冲突解决后 git add 标记，再 commit 完成合并
options:
  - --no-ff : 即使能快进也生成合并提交，保留分支历史
  - --ff-only : 只允许快进，否则直接失败
  - --squash : 把对方所有改动压成一个未提交的改动
  - --abort : 放弃合并，恢复到合并前状态
  - --continue : 冲突解决后继续完成合并
  - -m : 指定合并提交的说明
examples:
  git switch main && git merge feature/order   // 把功能分支合并到 main
  git merge --no-ff feature/order   // 强制保留合并提交
  git merge --abort   // 合并冲突后放弃
pitfalls:
  - 冲突没解决完就 commit 会留下半成品，先 git status 确认没有未合并路径
  - 在错误的分支上执行 merge 会把方向搞反，合并前先看清当前分支
docs: https://git-scm.com/docs/git-merge

===== git-fetch | git fetch | git-remote | 进阶
tagline: 把远程更新拉到本地但不合并
plain: git fetch 只下载远程的新提交和分支引用，更新 origin/main 这类远程跟踪分支，不会动你的工作区和当前分支。它是先看看远程有什么的安全动作，合并留给 merge 或 pull。
syntax: git fetch [<remote>]
keyPoints:
  - fetch 只更新远程跟踪分支，不合并、不改工作区
  - 拉到的新提交此时只在 origin/main，本地 main 还没动
  - --prune 顺手清理远程已删除的分支
options:
  - --all : 抓取所有远程的更新
  - --prune : 删除远程已不存在的跟踪分支
  - --tags : 同时抓取所有标签
  - --depth : 抓取时限制历史深度
  - --force : 强制更新被改写的远程跟踪分支
examples:
  git fetch origin   // 拉取 origin 的全部更新
  git fetch --prune   // 拉取并清理失效分支
  git fetch --all   // 所有远程一起拉
pitfalls:
  - fetch 之后代码并没有变，还需要 merge 或 rebase 才能用上
  - 远程分支被强推后 fetch 会拒绝更新，确认无误再用 --force
docs: https://git-scm.com/docs/git-fetch

===== git-pull | git pull | git-remote | 入门
tagline: 拉取远程并合并到当前分支
plain: git pull 等于 git fetch 加一次合并：先下载远程更新，再把当前分支的跟踪分支合并进来。默认是 merge；配置 pull.rebase=true 或在命令里加 --rebase 就改用变基，历史更直。
syntax: git pull [<remote>] [<branch>]
keyPoints:
  - pull 等于 fetch 加 merge 或 rebase，两步在一条命令里完成
  - --rebase 用变基方式整合，本地未推送的提交会被重放
  - 本地有未提交改动时 pull 可能失败，先 stash 或 commit
options:
  - --rebase : 拉取后用变基整合，避免生成合并提交
  - --no-rebase : 拉取后用合并整合，这是默认行为
  - --ff-only : 只允许快进，不能快进就失败
  - --autostash : 拉取前自动暂存改动，结束后恢复
  - --all : 拉取所有远程
examples:
  git pull origin main   // 拉取并合并
  git pull --rebase origin main   // 拉取并变基
  git pull --ff-only   // 只允许快进
pitfalls:
  - 本地有未提交改动时 pull 会报错，先 stash 或提交
  - 共享分支上 rebase 式 pull 会改写本地提交，推送前确认没人基于它开发
docs: https://git-scm.com/docs/git-pull

===== git-push | git push | git-remote | 进阶
tagline: 把本地提交推送到远程
plain: git push 把本地分支的提交上传到远程仓库。首次推送用 -u 建立跟踪关系，之后直接 git push。推送被拒绝通常是远程有别人新提交，先 pull 再推；--force 会覆盖远程历史。
syntax: git push [<remote>] [<branch>]
keyPoints:
  - -u 首次推送时设置上游，之后直接 git push 就能用默认远程
  - 被拒绝说明远程有新提交，先 git pull 整合再推
  - --force 会覆盖远程历史，别人已推送的提交可能直接丢失
options:
  - -u : 设置上游跟踪分支，之后可直接 git push
  - --force : 强制覆盖远程分支，可能丢失他人提交
  - --force-with-lease : 远程没被别人更新时才强推，更安全
  - --tags : 把所有标签推送到远程
  - --delete : 删除远程分支
  - --all : 推送所有分支
examples:
  git push -u origin main   // 首次推送并设置上游
  git push   // 推送当前分支
  git push origin --delete feature/order   // 删除远程分支
pitfalls:
  - --force 会把远程回滚到你的版本，别人已推送的提交会消失，共享分支禁止使用
  - 推送前先 git log origin/main..HEAD 看看到底要推哪些提交
docs: https://git-scm.com/docs/git-push

===== git-reset | git reset | git-undo | 进阶
tagline: 移动 HEAD 并重置暂存区
plain: git reset 把当前分支的 HEAD 指回某个提交，同时按模式处理暂存区和工作区。--soft 只挪指针留着改动，--mixed（默认）连暂存区一起重置，--hard 连工作区都覆盖，未提交的改动直接丢失。
syntax: git reset [--soft|--mixed|--hard] <commit>
keyPoints:
  - 三种模式差异在暂存区和工作区：soft 全留、mixed 留工作区、hard 全丢弃
  - 默认是 --mixed，撤销 git add 常用 git reset HEAD <file>
  - --hard 会覆盖工作区，未提交改动彻底丢失
options:
  - --soft : 只移动 HEAD，改动全部留在暂存区
  - --mixed : 移动 HEAD 并重置暂存区，工作区不动
  - --hard : 连工作区一起重置，未提交改动会丢失
  - --keep : 重置但保留有改动的文件，冲突则放弃
  - -p : 交互式选择要重置的代码块
examples:
  git reset --soft HEAD~1   // 撤销上一次提交但保留改动
  git reset HEAD src/App.java   // 把文件退出暂存区
  git reset --hard a1b2c3d   // 彻底回退到某个提交
pitfalls:
  - --hard 会覆盖工作区未提交的改动，执行前先 git status 看清有没有要保留的内容
  - reset 改写本分支历史，已经推送过的提交不要 reset，改用 revert
docs: https://git-scm.com/docs/git-reset

===== git-revert | git revert | git-undo | 进阶
tagline: 用一次新提交抵消旧提交
plain: git revert 生成一个反向的新提交，把指定提交的改动抵消掉，原提交仍在历史里。它不改写已经推送的历史，是团队协作里撤销错误提交的安全做法，冲突时和 merge 一样处理。
syntax: git revert <commit>...
keyPoints:
  - revert 新增提交来抵消旧改动，不删除原有提交
  - 适合撤销已推送的提交，不会改写别人的历史
  - -n 只改工作区不提交，多个提交可一起撤销
options:
  - -n : 只应用反向改动，不自动提交
  - --abort : 放弃整个 revert 过程
  - --continue : 冲突解决后继续
  - -m : 撤销合并提交时指定主线父提交
  - --skip : 跳过当前提交继续
  - -e : 提交前编辑说明
examples:
  git revert a1b2c3d   // 撤销某次错误提交
  git revert -n a1b2c3d   // 只应用改动稍后一起提交
  git revert --abort   // revert 冲突后放弃
pitfalls:
  - revert 一个合并提交要加 -m 指定主线，否则会报错
  - 撤销后再 revert 同一个提交会互相抵消，确认历史没有重复操作
docs: https://git-scm.com/docs/git-revert

===== git-clean | git clean | git-undo | 进阶
tagline: 删除工作区里的未跟踪文件
plain: git clean 删掉工作区中没被 Git 跟踪的文件和目录，比如编译产物、临时文件。它只动未跟踪内容，已跟踪文件的改动不受影响。删除不可恢复，先加 -n 预览再动手。
syntax: git clean [-n] [-f] [-d]
keyPoints:
  - 只删未跟踪的文件，已跟踪文件和暂存内容不受影响
  - -n 只预览不删除，执行前一定先跑一遍
  - -fdx 连被忽略的构建产物也删，删掉就找不回来
options:
  - -n : 只列出会被删除的文件，不真正删除
  - -f : 确认删除未跟踪文件，必需参数
  - -d : 连未跟踪的目录一起删除
  - -x : 连被忽略的文件也一起删除
  - -X : 只删除被忽略的文件
  - -i : 交互式选择要删除的内容
examples:
  git clean -nd   // 先预览会删什么
  git clean -fd   // 删除未跟踪文件
  git clean -fdx   // 清理含忽略文件的构建产物
pitfalls:
  - clean 删除的文件不进回收站，git 也无法恢复，务必先用 -n 预览
  - -x 会删掉被忽略的配置和构建缓存，本地环境可能需要重新生成
docs: https://git-scm.com/docs/git-clean

===== git-bisect | git bisect | git-history | 进阶
tagline: 二分查找引入问题的提交
plain: git bisect 用二分法定位哪次提交引入了 bug：先标记一个已知正常的提交和一个已出问题的提交，Git 每次切到中间提交，你测试后告诉它好坏，最后定位到第一个坏提交。整个过程结束后要用 reset 退出。
syntax: git bisect start <bad> <good>
keyPoints:
  - 标记 good 和 bad 之后，Git 自动切到中间的提交让你验证
  - git bisect run 可以接测试脚本全自动完成定位
  - 定位完必须 git bisect reset 回到原来的分支
options:
  - --no-checkout : 只做二分不切换工作区
  - --first-parent : 只沿第一父提交链查找
  - --reset-when-found : 找到后本次会话自动重置
  - --term-good : 自定义“好”这个状态的名称
  - --term-bad : 自定义“坏”这个状态的名称
examples:
  git bisect start   // 开始二分查找
  git bisect bad HEAD && git bisect good v1.2.0   // 标记坏提交和好提交
  git bisect run mvn test -Dtest=OrderTest   // 用脚本自动二分
pitfalls:
  - 不执行 git bisect reset 会一直停在游离状态，容易误提交
  - 测试脚本要准确反映好坏，否则会把范围带到错误方向
docs: https://git-scm.com/docs/git-bisect
