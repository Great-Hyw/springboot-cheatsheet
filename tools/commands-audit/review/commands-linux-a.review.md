===== linux-pwd | pwd | linux-file | 入门
tagline: 显示当前所在目录的绝对路径
plain: 敲错地方想确认自己在哪、或写脚本要拿绝对路径时用它。pwd 打印当前工作目录的完整路径，输出从 / 开头，可以直接拼给别人或写进脚本里。
syntax: pwd [选项]
keyPoints:
  - 输出一定是绝对路径，从 / 开头，可直接复制给别人用
  - 默认 -L，显示逻辑路径，进符号链接目录时按原写法显示
  - 加 -P 解析掉符号链接，看到真实的物理路径
  - 想拿路径可以 dir=$(pwd)，比手拼路径可靠
options:
  - -L : 显示逻辑路径，保留符号链接目录名（默认）
  - -P : 显示物理路径，把符号链接全部解开
  - --help : 打印用法摘要后退出
examples:
  pwd   // 看当前目录
  pwd -P   // 看解析符号链接后的真实路径
  dir=$(pwd)   // 在脚本里把路径存进变量
pitfalls:
  - 在软链接目录里 pwd 和 pwd -P 结果不同，别把两者混用
  - cd 之后路径已经变了，别拿旧路径继续操作
related: linux-cd, linux-ls, linux-find
docs: man7: pwd(1) https://man7.org/linux/man-pages/man1/pwd.1.html
tags: 路径, 目录, 内置命令

===== linux-mkdir | mkdir | linux-file | 入门
tagline: 创建新目录
plain: 要按项目建多级目录、或临时建个放日志的文件夹时用它。mkdir 可以一次建一个或多个目录，-p 能把缺的父目录一起建出来，-m 还能直接指定新目录的权限。
syntax: mkdir [选项] 目录...
keyPoints:
  - mkdir -p a/b/c 连父目录一起建，目录已存在也不报错
  - 默认权限受 umask 影响，目录常见结果是 755 或 775
  - -m 直接给定权限，如 -m 700 建一个私有目录
  - 一次可以给多个目录名，用空格分开即可
options:
  - -p : 递归创建父目录，目录已存在不报错
  - -m : 按给定权限创建，如 -m 750
  - -v : 每创建一个目录就打印一条信息
examples:
  mkdir -p /opt/app/logs/2026   // 建多级目录
  mkdir -m 700 ~/private   // 建只有自己可读写的目录
  mkdir html css js   // 一次建三个目录
pitfalls:
  - 不加 -p 时父目录不存在会直接报错，建多级目录记得加
  - -m 给的是最终权限，不会再被 umask 削掉，误以为两者叠加
related: linux-touch, linux-rm, linux-cd
docs: man7: mkdir(1) https://man7.org/linux/man-pages/man1/mkdir.1.html
tags: 目录, 创建

===== linux-find | find | linux-file | 进阶
tagline: 按条件递归查找文件
plain: 忘了文件放哪、要按名字或时间批量找文件时用它。find 从指定目录往下递归，用 -name、-type、-mtime 等条件过滤，还能配合 -exec 直接处理找到的文件。
syntax: find [路径...] [条件] [动作]
keyPoints:
  - find /var/log -name '*.log' 按名字查，模式要加引号防 shell 展开
  - -type f 只要普通文件，-type d 只要目录，-type l 只要链接
  - -mtime +7 找七天前改过的，-size +100M 找大于 100M 的
  - -exec 对结果执行命令，{} 代表文件名，结尾用 \; 表示逐条执行
  - -delete 直接删除匹配项，先不加它跑一遍看结果
options:
  - -name : 按文件名匹配，支持通配符
  - -type : 按类型过滤：f 文件、d 目录、l 链接
  - -mtime : 按修改时间过滤，+7 表示七天以前
  - -size : 按大小过滤，+100M 表示大于 100M
  - -maxdepth : 限制向下递归的层数
  - -exec : 对每个匹配结果执行命令
  - -delete : 删除匹配到的文件或目录
examples:
  find /var/log -type f -name '*.log'   // 找 /var/log 下所有日志文件
  find /var/log -type f -name '*.log' -mtime +7 -delete   // 删掉七天前的旧日志
  find / -type f -size +100M 2>/dev/null   // 找出大于 100M 的文件
  find . -type f -name '*.jpg' -exec gzip {} \;   // 压缩找到的 jpg 文件
pitfalls:
  - find / -name 会扫整块盘，很慢，先尽量缩小查找目录
  - -delete 不提示直接删，先去掉它确认结果列表再执行
  - 条件里的通配符不加引号会被 shell 先展开，结果不对
related: linux-ls, linux-rm, linux-grep
docs: man7: find(1) https://man7.org/linux/man-pages/man1/find.1.html
tags: 查找, 递归, 批量

===== linux-cat | cat | linux-text | 入门
tagline: 把文件内容直接打印到屏幕
plain: 想快速看一个小配置文件、或把两个文件接起来时用它。cat 把文件内容原样输出到终端，适合小文件；文件大时会刷屏，长文件应该改用 less 分页看。
syntax: cat [选项] [文件...]
keyPoints:
  - cat 文件 直接输出全文，多个文件会按顺序拼接输出
  - cat a b > c 把两个文件合成一个，注意 > 会覆盖 c 原有内容
  - -n 给每行加行号，-b 只给非空行加行号
  - 后面不加文件时 cat 会读标准输入，按 Ctrl+D 结束
options:
  - -n : 所有输出行都加行号
  - -b : 只给非空行加行号，空行不编号
  - -A : 显示不可见字符，如制表符和行尾
  - -s : 压缩连续空行，多行只留一行
  - -E : 在每行末尾显示 $ 符号
examples:
  cat /etc/hosts   // 看 hosts 文件内容
  cat -n app.properties   // 带行号看配置
  cat part1.txt part2.txt > all.txt   // 把两个文件拼成一个
pitfalls:
  - 文件几百 MB 时 cat 会刷满终端，改用 less 或 head
  - cat a > a 会把 a 清空，读写不能是同一个文件
related: linux-less, linux-head, linux-tail
docs: man7: cat(1) https://man7.org/linux/man-pages/man1/cat.1.html
tags: 查看, 文本, 拼接

===== linux-less | less | linux-text | 入门
tagline: 分页查看大文件内容
plain: 日志几百兆、一屏放不下时用它。less 打开文件后能上下翻页、按 / 搜关键字，看完按 q 退出，不会像 cat 那样把终端刷满，还能跟踪正在增长的日志。
syntax: less [选项] 文件
keyPoints:
  - 空格下一页，b 上一页，方向键上下滚动，q 退出
  - /关键字 向下搜，?关键字 向上搜，n 跳到下一个匹配
  - G 跳到文件末尾，g 回到开头，100g 跳到第 100 行
  - 按 F 进入实时跟踪模式，等同 tail -f，Ctrl+C 退出跟踪
options:
  - -N : 在每行前显示行号
  - -S : 长行不折行，改用左右滚动查看
  - -R : 原样显示颜色控制符，看彩色日志用
  - -i : 搜索时忽略大小写
  - -F : 文件内容一屏放得下时直接退出
examples:
  less /var/log/syslog   // 分页看系统日志
  less -NR /var/log/nginx/access.log   // 带行号并保留颜色查看访问日志
  less +F /var/log/syslog   // 实时跟踪日志增长
pitfalls:
  - 卡住时先试 q 退出；误按 Ctrl+S 会像死机，按 Ctrl+Q 恢复
  - less 显示的是打开时的内容，日志在增长要按 F 跟踪
related: linux-cat, linux-tail, linux-grep
docs: man7: less(1) https://man7.org/linux/man-pages/man1/less.1.html
tags: 分页, 日志, 查看

===== linux-head | head | linux-text | 入门
tagline: 查看文件开头的若干行
plain: 只想看配置文件的前几行、或确认 CSV 表头长什么样时用它。head 默认打印前 10 行，-n 可以改行数，-c 还能按字节截取，不用把整个文件都读进屏幕。
syntax: head [选项] [文件...]
keyPoints:
  - 默认前 10 行，head -n 20 文件 看前 20 行
  - head -c 100 文件 只要前 100 个字节
  - 多文件时默认加文件名标题，-q 去掉标题
  - 写 -n 5 或 -5 都行，新写法推荐 -n 5
options:
  - -n : 指定显示前多少行，如 -n 20
  - -c : 按字节数显示开头部分，如 -c 512
  - -q : 多文件时不打印文件名标题
  - -v : 总是打印文件名标题
examples:
  head -n 20 /etc/nginx/nginx.conf   // 看配置文件前 20 行
  head -n 1 data.csv   // 看 CSV 表头
  head -n 3 a.txt b.txt   // 一次看两个文件的开头
pitfalls:
  - head 看到的不代表文件全貌，排查问题要结合 tail 或 less
  - 二进制文件别用 head 直接看，终端会被乱码刷乱
related: linux-tail, linux-cat, linux-less
docs: man7: head(1) https://man7.org/linux/man-pages/man1/head.1.html
tags: 查看, 行数, 文本

===== linux-cut | cut | linux-text | 入门
tagline: 按分隔符或字符位置切出字段
plain: 只想从日志或 CSV 里取某一列时用它。cut 用 -d 指定分隔符、-f 选第几列，或者用 -c 直接截取第几个字符，比 grep 取列更精确，也不改原文件。
syntax: cut [选项] [文件...]
keyPoints:
  - cut -d : -f 1 /etc/passwd 取第一列用户名
  - -f 可写多个：-f 1,3 或范围 -f 2-4
  - -c 按字符位置切，-b 按字节位置切
  - -d 只认单个字符分隔符，多空格分隔的列要换用 awk
options:
  - -d : 指定字段分隔符，只支持单字符
  - -f : 选择第几个字段，如 -f 1,3 或 -f 2-4
  - -c : 按字符位置截取，如 -c 1-10
  - -b : 按字节位置截取
  - -s : 不输出不含分隔符的行
  - --complement : 取反，输出未被选中的部分
examples:
  cut -d : -f 1 /etc/passwd   // 取 /etc/passwd 的用户名
  cut -d , -f 1,2 data.csv   // 取 CSV 的前两列
  cut -c 1-10 app.log   // 取每行前 10 个字符
pitfalls:
  - -d 只认单个字符，多空格分隔的列用 cut 会切错，改用 awk
  - cut 只输出到屏幕，要保存结果得自己重定向到文件
related: linux-awk, linux-sort, linux-grep
docs: man7: cut(1) https://man7.org/linux/man-pages/man1/cut.1.html
tags: 字段, 文本, 截取

===== linux-sed | sed | linux-text | 进阶
tagline: 批量替换或删除文本中的内容
plain: 要一次改配置文件里多处内容、或删掉日志里的空行时用它。sed 按行处理文本，最常用 s/旧/新/g 做替换；加 -i 直接改文件，不加只把结果输出到屏幕。
syntax: sed [选项] '脚本' [文件...]
keyPoints:
  - sed 's/old/new/' 只换每行第一处，加 g 换掉全部
  - -i 直接修改文件，-i.bak 改的同时留一份 .bak 备份
  - -n 关掉默认输出，配合 p 只打印匹配行
  - 3d 删第 3 行，/pattern/d 删匹配到的行
  - -E 用扩展正则，写 (a|b) 更省事
options:
  - -i : 直接修改源文件，不输出到屏幕
  - -n : 不自动打印，配合 p 只输出需要的行
  - -e : 指定多条脚本，可以重复写多个
  - -E : 使用扩展正则表达式
  - -f : 从文件读取 sed 脚本
examples:
  sed -i 's/8080/9090/g' application.properties   // 把配置里的端口改成 9090
  sed -n '/ERROR/p' app.log   // 只打印含 ERROR 的行
  sed -i.bak '/^$/d' config.txt   // 删除空行并保留原文件备份
pitfalls:
  - sed -i 改完无法撤销，先加 .bak 备份或提前 cp 一份
  - GNU sed 的 -i 可以直接写，BSD 和 macOS 上要写成 -i ''
  - 替换内容里有 / 时换个分隔符，如 s|/a|/b|g，避免转义
related: linux-grep, linux-awk, linux-cut
docs: man7: sed(1) https://man7.org/linux/man-pages/man1/sed.1.html
tags: 替换, 文本, 批量

===== linux-chmod | chmod | linux-perm | 入门
tagline: 修改文件和目录的访问权限
plain: 脚本没执行权限跑不起来、或改完文件别人访问不了时用它。chmod 用 rwx 或数字权限设置，755、644 是最常见的两组，-R 可以递归处理整个目录。
syntax: chmod [选项] 权限 文件...
keyPoints:
  - 数字法：755 表示属主可读写执行，组和其他人可读可执行
  - 644 表示属主可读写，组和其他人只读，普通文件常用
  - 符号法：chmod u+x 给属主加执行，chmod go-w 去掉组和他人写
  - -R 递归修改目录下所有文件和子目录的权限
options:
  - -R : 递归修改目录及其全部内容
  - -v : 显示处理过的每个文件
  - -c : 只显示真正发生变化的文件
  - --reference : 参照另一个文件的权限来设置
examples:
  chmod +x deploy.sh   // 给部署脚本加执行权限
  chmod 755 /opt/app   // 应用目录设为属主可写、其他人只读
  chmod -R 755 /var/www/html   // 递归修正网站目录权限
pitfalls:
  - chmod 777 让任何人都能改文件，线上目录这样设等于开门
  - chmod -R 777 会把子目录和文件权限全放开，事后很难逐项恢复
  - 目录需要 x 权限才能进入，所以目录用 755、普通文件用 644
related: linux-chown, linux-umask, linux-ls
docs: man7: chmod(1) https://man7.org/linux/man-pages/man1/chmod.1.html
tags: 权限, rwx, 安全

===== linux-umask | umask | linux-perm | 进阶
tagline: 设置新建文件的默认权限掩码
plain: 想知道为什么新建目录是 755、文件是 644，或想改这个默认值时就查它。umask 决定新建时去掉哪些权限，普通用户常见 022 或 002，只对当前 shell 生效。
syntax: umask [-p] [-S] [mode]
keyPoints:
  - umask 022 表示新建时去掉组和其他人的写权限
  - 普通文件基数 666，目录基数 777，各自减掉掩码得到实际权限
  - umask -S 用符号形式显示，umask -p 输出可复用的命令
  - 只影响当前 shell，写进 /etc/profile 或 ~/.bashrc 才能持久
options:
  - -S : 用符号形式显示掩码，如 u=rwx,g=rx,o=rx
  - -p : 输出可直接复用为输入的命令形式
  - -pS : 同时用 -p 和 -S，输出带 -S 的可复用命令
examples:
  umask   // 查看当前掩码
  umask -S   // 用符号形式查看
  umask 022   // 新建文件默认不给组和其他人写权限
pitfalls:
  - umask 只对当前 shell 生效，另开终端或用 sudo 都不继承
  - 把 umask 设成 000 会让新文件对所有人可读写，别这么干
related: linux-chmod, linux-chown, linux-useradd
docs: man7: bash(1) 内置命令 umask https://man7.org/linux/man-pages/man1/bash.1.html
tags: 权限, 掩码, 默认值

===== linux-sudo | sudo | linux-perm | 进阶
tagline: 以其他用户身份执行单条命令
plain: 改系统配置提示权限不够时，在命令前加 sudo。sudo 按 sudoers 规则临时提权执行这一条命令，用完就退回普通用户，比一直用 root 账号更安全。
syntax: sudo [选项] 命令
keyPoints:
  - sudo 只对紧跟的那条命令生效，不会切换整个 shell 身份
  - sudo -i 打开 root 登录 shell，sudo -s 打开 shell 但保留环境
  - sudo -u 用户名 命令 以指定用户身份运行
  - 首次使用要输自己的密码，默认几分钟内免重复输入
  - 能执行什么由 /etc/sudoers 决定，改它要用 visudo
options:
  - -u : 指定以哪个用户身份执行
  - -i : 启动目标用户的登录 shell
  - -s : 启动 shell 但保留当前环境变量
  - -k : 立即让 sudo 凭证失效，下次重新输密码
  - -l : 列出当前用户可以执行的 sudo 命令
examples:
  sudo less /var/log/syslog   // 用 root 权限查看受限日志
  sudo -u deploy /opt/app/start.sh   // 以 deploy 用户身份执行脚本
  sudo -l   // 查看自己能执行哪些 sudo 命令
pitfalls:
  - sudo cd 不会切换目录，cd 是 shell 内置命令，sudo 只认外部程序
  - 在 sudoers 里给 NOPASSWD ALL 等于直接给 root 权限
  - sudo 要输的是当前用户自己的密码，不是 root 密码
related: linux-su, linux-chown, linux-chmod
docs: man7: sudo(8) https://man7.org/linux/man-pages/man8/sudo.8.html | man7: sudoers(5) https://man7.org/linux/man-pages/man5/sudoers.5.html
tags: 提权, root, 权限
