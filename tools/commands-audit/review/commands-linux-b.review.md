===== linux-ps | ps | linux-process | 入门
tagline: 看当前有哪些进程
plain: 机器变慢、端口被占、想确认服务到底起没起来时，先 ps 看进程。它只输出某一瞬间的快照，最常用的是 ps aux 看所有用户，或 ps -ef 看父子关系和完整命令。列里的 PID 就是后面 kill 要用的号码。
syntax: ps [选项]
keyPoints:
  - aux 看所有用户的进程，-ef 看父子关系和完整命令。
  - PID 是进程号，PPID 是父进程号，kill 时用 PID。
  - STAT 列里 Z 是僵尸进程，T 是已暂停，S 是睡眠。
  - 过滤结果：ps aux | grep nginx，别忘 grep -v grep。
options:
  - -e : 显示系统里所有进程（UNIX 风格）
  - -f : 完整格式，带 UID、PID、PPID 和完整命令
  - -u : 只看指定用户的进程，如 -u root
  - -o : 自定义输出列，如 -o pid,cmd
  - --sort : 按指定字段排序，减号表示倒序
examples:
  ps aux   // 看所有进程，BSD 风格最常用
  ps -ef   // 看父子关系和完整命令
  ps -u root   // 只看 root 用户的进程
  ps aux --sort=-%mem | head   // 按内存占用从高到低排
pitfalls:
  - ps 是一瞬间的快照，进程变化快时要反复看或改用 top。
  - ps aux | grep 名字会把 grep 自己列出来，记得加 grep -v grep。
related: linux-top, linux-kill, linux-pkill
docs: man7: ps(1) https://man7.org/linux/man-pages/man1/ps.1.html
tags: 进程, 排查, PID

===== linux-pkill | pkill | linux-process | 进阶
tagline: 按名字批量结束进程
plain: 不想挨个查 PID 时用 pkill，它按进程名、完整命令行或用户匹配后直接发信号。改完代码要重启一堆同名 worker、清掉测试遗留进程时很方便。默认同样发 SIGTERM，建议先 pgrep -a 看会命中谁，再决定要不要真杀。
syntax: pkill [选项] 进程名
keyPoints:
  - pkill 是 pgrep 的姊妹命令，先 pgrep -a 名字看命中再动手。
  - -f 匹配完整命令行，适合 java -jar 这类同名进程。
  - -u 只动指定用户的进程，避免误伤别人的任务。
  - 默认发 SIGTERM，要强杀写 pkill -9 进程名。
options:
  - -f : 匹配完整命令行，而不只是进程名
  - -u : 只结束指定用户的进程
  - -x : 进程名必须完全相等才匹配
  - -9 : 发送 SIGKILL 强制结束
  - -e : 显示被结束的进程名，方便核对
examples:
  pgrep -a nginx   // 先确认会命中哪些进程
  pkill nginx   // 按进程名批量结束
  pkill -u deploy -9 java   // 强制结束 deploy 用户的所有 java 进程
pitfalls:
  - 匹配是正则子串，pkill ssh 可能把 sshd 一起杀掉，先 pgrep -a 确认。
  - pkill -f java 会命中所有命令行含 java 的进程，生产机上别乱用。
related: linux-ps, linux-kill, linux-top
docs: man7: pkill(1) https://man7.org/linux/man-pages/man1/pkill.1.html
tags: 进程, 批量, 信号

===== linux-jobs | jobs | linux-process | 入门
tagline: 查看当前终端里的后台任务
plain: 命令末尾加 & 或按 Ctrl+Z 挂起后，任务就归当前 shell 管；jobs 列出这些后台作业和编号。它只看得到本 shell 启动的作业，换个终端就查不到。关掉终端时作业默认收到 SIGHUP 一起退出，长期任务要交给 nohup 或 systemd。
syntax: jobs [选项] [作业号]
keyPoints:
  - 只显示当前 shell 的作业，不是系统里所有进程。
  - %1 这种作业号可以用在 fg、bg、kill 里。
  - Ctrl+Z 是把作业挂起（停止状态），用 bg 让它后台继续。
  - 终端关闭时作业默认收到 SIGHUP，任务随之退出。
options:
  - -l : 列出作业时同时显示 PID
  - -p : 只输出作业的 PID
  - -r : 只列正在运行的作业
  - -s : 只列已停止（挂起）的作业
examples:
  jobs -l   // 列后台作业并显示 PID
  jobs -r   // 只列正在运行的作业
  bg %1   // 让挂起的作业在后台继续跑
  fg %1   // 把第 1 个作业调回前台
pitfalls:
  - jobs 的作业号只在当前 shell 有效，换窗口就没了。
  - 终端关闭后后台作业可能被 SIGHUP 杀掉，长期任务用 nohup。
related: linux-nohup, linux-ps, linux-kill
docs: GNU Bash 手册：作业控制内建命令 https://www.gnu.org/software/bash/manual/html_node/Job-Control-Builtins.html
tags: 后台任务, 终端, 作业控制

===== linux-free | free | linux-process | 入门
tagline: 看内存用了多少
plain: 内存告急、服务被 OOM 杀掉时，free 看总量、已用和剩余。重点看 available 那一列，它才是应用真正能拿到的内存，buff/cache 是可回收的缓存，不该算成被占用。加 -h 用易读单位，加 -s 3 每 3 秒刷新一次。
syntax: free [选项]
keyPoints:
  - 重点看 available，它才是应用实际可用的内存。
  - buff/cache 是可回收的缓存，别当成被进程吃掉了。
  - free 列小不等于内存紧张，available 才是判断依据。
  - -h 易读单位，-s 3 每 3 秒刷新，-c 5 刷 5 次后退出。
options:
  - -h : 自动换算成 GiB、MiB 等易读单位
  - -m : 以 MiB 为单位显示
  - -g : 以 GiB 为单位显示
  - -s : 每 N 秒刷新一次，如 -s 3
  - -t : 多显示一行总计
  - -c : 刷新 N 次后退出，配合 -s 使用
examples:
  free -h   // 人类可读地看内存
  free -h -s 1 -c 5   // 每秒刷新一次，共看 5 次
  free -m   // 以 MB 为单位显示
pitfalls:
  - 别只看 free 列，buff/cache 可回收，真正要看 available。
  - 内存不够先查容器限额或进程泄漏，别急着加内存条。
related: linux-top, linux-uptime, linux-ps
docs: man7: free(1) https://man7.org/linux/man-pages/man1/free.1.html
tags: 内存, 监控, 排查

===== linux-ip | ip | linux-network | 入门
tagline: 看和改网卡与路由
plain: 新系统里用 ip 代替 ifconfig：ip addr 看地址，ip route 看路由，ip link 看网卡状态。加 -br 输出更简洁，加 -s 看收发包统计。注意 ip 命令的改动默认不持久，重启就丢，要写进网络配置或 Netplan 才长期生效。
syntax: ip [选项] 对象 命令
keyPoints:
  - ip addr 看地址，ip route 看路由，ip link 看网卡。
  - ip -br addr 一行一个网卡，比默认输出好扫读。
  - ip -s link 看每个网卡的收发包和错误统计。
  - ip 的改动默认不持久，重启后恢复，要写进配置文件。
options:
  - -br : 简洁输出，只显示关键字段
  - -s : 显示收发包和错误统计
  - -4 : 只看 IPv4 地址和路由
  - -6 : 只看 IPv6 地址和路由
  - -n : 在指定网络命名空间里执行
examples:
  ip -br addr   // 简洁列出所有网卡和地址
  ip route   // 看路由表
  ip -s link   // 看网卡收发包统计
  ip addr show eth0   // 查看指定网卡的地址
pitfalls:
  - ip 的改动默认不持久，重启就没了，要写进网络配置。
  - 改默认路由或地址可能把自己的 SSH 连接搞断，先留好控制台。
related: linux-ping, linux-ss, linux-ssh
docs: man7: ip(8) https://man7.org/linux/man-pages/man8/ip.8.html
tags: 网卡, 路由, 网络排查

===== linux-ping | ping | linux-network | 入门
tagline: 测主机通不通
plain: 怀疑网络断、DNS 配错、服务连不上时，先 ping 目标看通不通。默认一直发，用 -c 4 只发四个包方便看统计。ping 通只说明 ICMP 能到，不代表端口开着；很多云主机和防火墙默认禁 ping，ping 不通不等于服务挂了。
syntax: ping [选项] 主机名或IP
keyPoints:
  - 默认一直发，-c 4 只发 4 个包后停下看统计。
  - 能 ping 通只说明 ICMP 可达，不代表目标端口开放。
  - -W 设置等待回应的超时，弱网下可适当调大。
  - ping 域名不通但 IP 通，通常是 DNS 的问题。
options:
  - -c : 发送指定数量的包后停止
  - -i : 发包间隔秒数，默认 1 秒
  - -W : 等待回应的超时秒数
  - -s : 指定发送的包大小（字节）
  - -4 : 强制使用 IPv4
  - -6 : 强制使用 IPv6
examples:
  ping -c 4 example.com   // 只发 4 个包看统计
  ping -i 0.5 example.com   // 每 0.5 秒发一个包
  ping -6 example.com   // 用 IPv6 测连通
pitfalls:
  - ping 通只说明 ICMP 能到，不代表端口开放或服务正常。
  - 很多云主机默认禁 ping，ping 不通先查安全组再下结论。
related: linux-ip, linux-ssh, linux-curl
docs: man7: ping(8) https://man7.org/linux/man-pages/man8/ping.8.html
tags: 连通性, 网络, 排查

===== linux-curl | curl | linux-network | 进阶
tagline: 用命令行发 HTTP 请求
plain: 调试接口、下载文件、看响应头都用 curl。默认把响应打到终端，-o 存文件，-I 只看响应头，-L 跟随重定向。调 API 时用 -X 指定方法、-H 加请求头、-d 带请求体。它默认不把 4xx/5xx 当失败，脚本里请加 --fail。
syntax: curl [选项] URL
keyPoints:
  - -L 跟随重定向，-I 只看响应头，-o 存到文件。
  - -X 指定方法，-H 加请求头，-d 发送请求体。
  - 默认把 4xx/5xx 当成功，脚本里要加 --fail。
  - -s 安静模式配合 -S，出错时仍打印错误信息。
options:
  - -L : 跟随 3xx 重定向
  - -I : 只请求响应头，使用 HEAD 方法
  - -o : 把响应体保存到指定文件
  - -s : 安静模式，不显示进度和错误
  - -X : 指定 HTTP 方法，如 -X POST
  - -H : 添加请求头，可以重复使用多个
  - --fail : HTTP 状态码不小于 400 时返回非零退出码
examples:
  curl -I https://example.com   // 只看响应头
  curl -L -o page.html https://example.com   // 跟随重定向并保存到文件
  curl -X POST -H 'Content-Type: application/json' -d '{"name":"tom"}' https://example.com/api   // 发带 JSON 请求体的 POST
  curl -sS --fail https://example.com/api   // 脚本里失败就报错
pitfalls:
  - curl 默认不跟随重定向，也不把 4xx/5xx 当失败，要加 -L 和 --fail。
  - -X POST 不会自动加请求头，发 JSON 要自己带 Content-Type。
related: linux-wget, linux-ping, linux-ssh
docs: curl 官方手册 https://curl.se/docs/manpage.html
tags: HTTP, 接口调试, 下载

===== linux-ss | ss | linux-network | 入门
tagline: 看谁在监听端口
plain: 服务起不来、端口被占时用 ss 查 socket，它已经取代 netstat。ss -tlnp 看 TCP 监听和对应进程，-u 看 UDP，-s 看连接数汇总。看进程名需要 root 权限，普通用户跑 -p 只显示自己的进程。
syntax: ss [选项]
keyPoints:
  - -t TCP、-u UDP、-l 只看监听、-n 不解析服务名。
  - -p 显示占用 socket 的进程，通常要 root。
  - ss -tlnp 是查端口占用的标准组合。
  - -s 输出连接数汇总，快速判断连接是否堆积。
options:
  - -t : 只看 TCP 连接
  - -u : 只看 UDP 连接
  - -l : 只看监听状态的 socket
  - -n : 直接显示端口号，不做服务名解析
  - -p : 显示占用 socket 的进程
  - -s : 显示连接数汇总统计
examples:
  ss -tlnp   // 看 TCP 监听和进程
  ss -ulnp   // 看 UDP 监听
  ss -s   // 看连接数汇总
  ss -tlnp | grep 8080   // 查 8080 端口谁在用
pitfalls:
  - 看别的用户进程需要 root，普通用户跑 -p 只能看到自己的。
  - ss 只显示当前时刻的连接，抓瞬时短连接要配合循环或抓包。
related: linux-ip, linux-curl, linux-ssh
docs: man7: ss(8) https://man7.org/linux/man-pages/man8/ss.8.html
tags: 端口, 连接, 网络排查

===== linux-rsync | rsync | linux-network | 进阶
tagline: 增量同步文件
plain: rsync 只传有变化的部分，适合备份、发布和迁移大目录。日常用 rsync -avz 源 目标，加 -n 先演练看会动哪些文件，--delete 让目标端和源保持一致。源路径末尾有没有斜杠语义不同，这一点最容易搞错。
syntax: rsync [选项] 源 目标
keyPoints:
  - 只传差异部分，重复同步很快，适合反复发布。
  - 源路径末尾加斜杠是同步目录内容，不加是同步目录本身。
  - -n 演练模式只打印动作，确认无误再去掉 -n。
  - --delete 删除目标端多余文件，让两边完全一致。
options:
  - -a : 归档模式，递归并保留权限、时间等属性
  - -v : 输出同步了哪些文件
  - -z : 传输时压缩，省带宽但费 CPU
  - -n : 演练模式，只显示会做什么不真执行
  - -P : 显示进度并支持断点续传
  - --delete : 删除目标端多余的文件，保持完全一致
  - -e : 指定远程 shell，如 -e ssh
examples:
  rsync -avz ./dist/ deploy@10.0.0.5:/var/www/app/   // 本地目录增量同步到远端
  rsync -avzn ./dist/ deploy@10.0.0.5:/var/www/app/   // 先演练看会动哪些文件
  rsync -avz --delete ./dist/ deploy@10.0.0.5:/var/www/app/   // 让远端和本地完全一致
pitfalls:
  - 源路径末尾的斜杠决定同步目录内容还是目录本身，写错会多一层目录。
  - --delete 会删掉目标端多余文件，先用 -n 演练并确认路径。
related: linux-scp, linux-ssh, linux-wget
docs: man7: rsync(1) https://man7.org/linux/man-pages/man1/rsync.1.html | rsync 官网：how rsync works https://rsync.samba.org/how-rsync-works.html
tags: 同步, 备份, 增量

===== linux-du | du | linux-disk | 进阶
tagline: 找出哪个目录占空间
plain: 磁盘满了要知道是谁占的：du -sh * 看当前目录各项大小，du -h --max-depth=1 /var 看 /var 下各子目录。它靠遍历文件统计，目录大就慢；统计的是占用的磁盘块，和文件逻辑大小可能不同。先定位再删，别直接 rm。
syntax: du [选项] [路径]
keyPoints:
  - -s 只显示总计，-h 用易读单位，两者常一起用。
  - --max-depth=1 只看下一层，避免刷屏。
  - 统计的是磁盘块占用，和 ls 显示的逻辑大小可能不同。
  - 配合 sort -hr 从大到小排，快速找大目录。
options:
  - -h : 用易读单位显示大小
  - -s : 只显示每个参数的总计
  - -a : 连每个文件的大小也列出来
  - --max-depth : 限制统计深度，如 --max-depth=1
  - -c : 最后多输出一行总计
  - -x : 不跨文件系统统计
examples:
  du -sh *   // 看当前目录各项占用
  du -h --max-depth=1 /var | sort -hr | head   // 看 /var 下一层占用排行
  du -sh /var/log   // 只看某个目录总大小
  du -ah . | sort -hr | head -20   // 统计并从大到小排
pitfalls:
  - du 统计占用的磁盘块，和文件逻辑大小可能不一样。
  - 目录里文件很多时 du 很慢，先定位大目录再细看。
related: linux-df, linux-tar, linux-rsync
docs: man7: du(1) https://man7.org/linux/man-pages/man1/du.1.html
tags: 磁盘, 目录, 排查
