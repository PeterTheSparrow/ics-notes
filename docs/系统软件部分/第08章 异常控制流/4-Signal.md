---
title: 第四节 Signal
sidebar_position: 4
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-4-signal.ppt"/>

## 第四节 Signal

> 接下来介绍的就是这个系统里面最重要的一个功能就是signal，因为它的能力是反过来的，是由操作系统来调用你的应用程序的。这个 signal 它也会有 handler 的程序，但这个 handler 是应用程序写的，它和调用System Call是相反的。

### 一、简介和概念

#### 1）概述

我们之前写代码的时候，从来没有写过任何的signal，因为所有进程都有一个模版，比如说像 signal 这个 segmentation fault，它就是一个signal，这个 signal 发给你了之后它会调用 segmentation Fort 的这个 signal handler，这这个 signal handler 做什么事情？就是 exit 退出。

所以这就是默认的行为，我们自己也可以自己实现自己的逻辑，覆盖原来的默认的处理方法。比如把Ctrl+C转给另外一个子进程。让系统干掉子进程的程序。那么我们的 signal 就关注这一点。

#### 2）概念

- Signal的全称是Unix Signal，因为它其实是一种机制，Unix 这个整个操作系统的这个 family 里面都会支持这个 signal 存在，是这个 exception 的一个 high level 的一个表示。exception 就是我的硬件出了一些什么样的情况，有些什么事情我要通知上面软件，所以它通知了操作系统。而 signal 是操作系统这边有些什么样的事情，他要去通知你的应用程序。可以看出来都是通知机制
- signal 的来源有两种：一种可能是操作系统想找你，另外一种可能是其他进程想找你，但是进程之间是不能够直接互相的交流的，因为这样不安全，必须经过OS
- 它其实是利用了 system call，进入到内核，然后利用signal发送通知到进程。比如A要给B发送信号，首先需要A调用SystemCall，然后操作系统给B，这样经过了中间层，更加安全。
- signal 你可以认为是一个消息，一个messenger，这个 messenger 是用来通知这个进程的，告诉这个进程一些事情的。他携带的信息只有一个Byte，就是信号的ID，它是这个 event 的一种， 

#### 3）常见的信号

Singnal产生的来源可能是两个层面的：

- 高层面的是软件层面的，是内核里面或者其他用户进程里面的
- 底层面的是硬件层面的，比如硬件发生了除以0错误

最常见的`pkill -9 XXXX`

- 9：Kill，用来杀死一个进程

然后下面三个都是硬件的：

- 8：除0出错，一般是硬件发现出错
- 4：非法指令
- 11：访问了非法的内存

上面的三个都是硬件的，当然还有一些软件的：

- 2：中断，ctrl+c就是对应的这个信号【Shell会转发给前台】看上去像是硬件的，实际上是软件的命令解释的有些牵强上课的时候。
- 9：Kill，刚刚介绍了
- 17：子进程退出的时候，告诉父进程，发一个Sig-17，父进程收到之后从WaitPID里面退出。其实如果我实现了处理机制，我的父进程就不需要在哪里死等着了，一旦收到子进程的信号，自动处理回收的逻辑

当然还有一些用户自定义的：User1、User2，用户可以设置自己的处理逻辑

- SigUser1、SigUser2都是用户可以自定义的。

#### 4）SystemCall和Signal区别

- 两个方向是相反的：SystemCall是软件调用的操作系统，Signal是操作系统通知软件
- signal 其实是一个 **异步** 的操作，因为进程本身它在执行，而操作系统你需要去联系他的时候，往往这个进程其实并不知道对不对，他在做自己的事情。操作系统联系你的进程的时候，它其实只是给了你一个信号，所以他给你的信息只能很少非常少的信息。它只能在异步的情况下，等到合适的时候才能起作用，
- SystemCall：进程联系操系统的时候，操作系统一直在等待那边的，所以 system call 是一个 **同步** 的操作

#### 5）学习机制

- 信号的传递分为两个步骤，一个是发送，一个是接收
- 他的行为和平时写的程序的行为不太一样，因为它是一个触发机制的，它对应的这个 handler 的执行和你main函数里面写的程序执行，它们之间关系是什么？听上去好像是一个并行执行的关系，signal handler 什么时候执行你并不确定，取决于别人什么时候给你发送这个signal，那么这样的话写的这个代码就变成了一种触发机制的，这个代码和大家传统实现的这个代码会有点不太一样。

### 二、Signal

#### 1）发送信号

- **发送Signal的主体**是：操作系统内核！但操作系统发送 signal 是通过操作系统里面的handler，他为什么要做这件事情的原因可能是硬件的，也可能是软件的，但最终是由Kernel来发出这个 signal 给一个目标进程。
- signal deliver 有两种原因，前面也已经说到：硬件的和软件的
  - 硬件来说是操作系统发现了一个 system 的event，那么其实就是操作系统的ExceptionHandler被调用了
  - 软件来说，它的来源就是一个软件的进程调用了kill这个SystemCall。要操作系统帮助他来发送一个 signal 给这个 destination 的process，

#### 2）Kill信号

- `Kill`是一个系统调用，并不是只能发送9这个杀死进程的信号。
- 和命令行里面的那个是一样的，只不过那个程序是下面函数的一个包装。

```c
# include <sys/types.h>
# include <signal.h>
int kill(pid_t pid, int sig);
# returns: 0 if OK, -1 on error
```

#### 3）原理

- 什么原理？操作系统给进程发送信号的时候，我们 **要强调它是异步** 的，所以这个进程不会等在那边等你的操作系统去调用。而且他因为要执行自己的代码，他也不会提供出来一个 handler 让你直接去调用。
- 操作系统给进程发送信号的时候，它只能通过邮件的方式通知一下，所以它其实是在某个地方去设置flag，然后在合适的时候去检查，回头去检查就相当于你每天有固定的时间，你在回家的时候，经过家门的时候看一下信箱去拿出来。所以 signal 这个 signal handler 的调用，或者这个 signal 的处理只在特定的时间才会发生，并不是在发送的时候立刻发生的。
- 响应的类型，进程收到信号之后，有三种可能的处理逻辑：
  - 第一个是直接无视掉，把这个邮件取出来直接扔掉，一看也不看。Ignore，也就是忽略。子进程退出的时候，向父进程发送的这个 signal 就是被 ignore 了，所以你们的程序里面从来没有写过 signal handler，
  - 第二个是terminal，这个例子不太好举，他看到这个邮件马上马上自爆了，比如内存访问异常
  - 第三个是捕捉Catch，也就是用户定义了处理逻辑，我按照用户定义的处理逻辑执行，用户定义的对象叫做 signal handle 
- signal 在被发出之后，一直到 signal 被处理之间这段时间，我们把这个 signal 叫做 pending signal，就这个 signal 在那边等待，那边也就属也就所谓的邮件，在你的邮箱里面躺着的段时间，这个邮件叫做 pending signal
- 邮箱只是个比喻，每个进程它都会有自己的一套signal，它的实现是非常的简洁的，它不可能给你设计一个非常复杂的数据结构，然后去表达很多信息，然后他要传递的信息也只有一个 signal number，只告诉你一个号，其他是什么都没有的。
- 不同号码的这个 signal 只能有一个 pending signal，每一个 signal 的 number 可以对应一个邮箱，每个进程它可能有 20 个邮箱。根据刚才看，有 20 个 signal 的话，有 20 个邮箱，然后 signal 会投递到指定的这个邮箱里面，但这个邮箱空间比较有限，你只能放一个邮件，第二个邮件再来这个邮件就被扔掉了，所以留在邮箱里面的所谓的 pending sequence 只能有一个。
- **所以当你发现邮件里面有一个邮件的时候，可能已经收到了很多次相同的信号了**
- 所以你如果打开邮箱看到里面有邮件，并不是说你只收到了一个signal，或者说一封邮件，你只代表了你收到了邮件。可能已经收到了 5 次这个signal，

> 为什么多次发送相同的Signal，如果没有被处理，会被忽略掉：
>
> - 你可以理解为一个数组，这个数组就是20个Bit长度。一旦有信号来了，他就把这个Bit位设置为1。处理之后就设置为0。
> - 为什么不用队列记录？这种数据结构太复杂了，不好记录。所以干脆用最简单的

#### 4）阻塞信号

- signal 是可以被 blocking 住的，一旦某个信号被Block掉，进程在做一些重要的事情的时候，就不会被打断去处理信号
- Block是每一个类型界别的，你可以Block所有的信号，也可以值Block一个类型的信号 
- 某个信号被Block的时候，并不代表这个信号不能被发送。只是接收端不会处理！

#### 5）内部数据结构

- Signal的内部数据结构怎么实现的？
- 内部结构它只有两个 bit vector，每一个 bit 对应一个 signal number，有 20 个 signal 不同类型的 signal 的话，那么你就是由 20 个 bit 组成的这个对象，这个对象一共有两个。一个叫做 pending bit vector，一个叫做 blocking bit vector。
  - pending bit vector：表示是否收到了
  - blocking bit vector：表示某个信号是否被阻塞。

|          | 0    | 1    | 2    | 3    | 4    | 5    | 6    | 7    | 8    | 9    | ...  |
| -------- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- | ---- |
| pending  |      |      |      |      |      |      |      |      |      |      |      |
| blocking |      |      |      |      |      |      |      |      |      |      |      |

- 假设收到了某个信号，就会把Pending设置为1。
- 接受者在接收的时候，会依次检查blocking数组是否设置为1，如果发现blocking掉了，那就不处理检查下一个，如果没有被block，检查pending是否被设置为1。
- 当**Signal Handler**被调用的之前，blocking数组的对应的信号会被设置为0
- 它这个数据结构非常简单，是一个 bit vector，所以它能够处理的情况就非常的有限

#### 6）进程组

- 命令行里面有没有见过一个竖的，然后前后两个都是命令？这就是管道
- 做一件事情的时候调用一个命令做不完，比如说我前面是一个 ls，我想把 ls 产生的结果去做一个排序，那么这是一个任务，我们称为一个job，一个 job 我需要由多个这个操作来多个程序来一起完成，这个时候我可以把它编在一块，这样效率比较高。
- 当你的 child process 创建出来的时候，默认是会加入到这个父亲这个进程组里面的，
- 那么进程组的这个 ID 默认情况下是由它里面包含的第一个进程的这个进程ID，就是直接他和他的组 ID 是一样的同名。比如一个3001父进程创建了2个子进程3002、3003，进程组的ID就是3001。

> 为什么介绍进程组：
>
> - 发送 signal 的对象他不是发给进程，而是进程组
> - 比如一个组里面几个人是去做一个job，当中有一个人执行了一个除0错，那么我光把这个进程杀掉其实是没意义的，因为后面比如等待他的人，那也执行不下去了
> - 所以杀死进程，或者向那个进程发出 signal 这种事情是以进程组为单位，从概念上比较合理

```c
#include <unistd.h>
pid_t getpgrp(void);
// returns: process group ID of calling process
#include <unistd.h>
pid_t setpgid(pid_t pid, pid_t pgid);
// returns: 0 on success, -1 on error
```

- 这两个函数一个获取进程组的PID号码，一个设置进程组的PID号码
- 子进程默认创建出来是和父进程在一个进程组里面的，但是也可以修改，可以出现脱离进程组。

- 注意：如果设置`pid=0`，PID就会使用自己当前的进程，如果`pgid=0`，就代表设置自己的进程ID作为自己的进程组ID
- 例如`setpgid(0,0)`，就是把自己进程组的ID设置为自己的进程的ID

- 如下图所示，一个shell进程开了好几个进程，有前台进程也有后台进程。当收到了Ctrl+C的时候，就会把信号移交给前台的进程组。所以所有的前台进程都是一个进程组

![截屏2023-05-13 21.15.36](./4-Signal.assets/%E6%88%AA%E5%B1%8F2023-05-13%2021.15.36.png)

- 回顾之前的

```
#include <sys/types.h>
#include <signal.h>
int kill(pid_t pid, int sig);
// returns: 0 if OK, -1 on error
```

- 如果PID小于0，将会给pid的绝对值所在的所有的进程组发送信号。
- 比如pid是 $-3000$，就会给进程组为3000下面的所有进程发送信号

#### 7）Alarm

- Alarm：是个闹钟，过一段时间之后叫自己，这个定的这个时间，指这个进程未来隔多久被发送信号
- 它这个执行的时间它这个也不是那么精确的，只能说秒级别的精确。他发送了这个 signal 叫做 sig alarm。
- 并不是说调一次 alarm 就会有一个闹钟，永远一个进程只有一个闹钟。如果多次调用就会发现后面的把前面都覆盖掉了，返回值**是前面一个闹钟还剩下多少秒**

```c
#include <unistd.h>
unsigned int alarm(unsigned int secs);
// returns: remaining secs of previous alarm, or 0 if no previous alarm
```

#### 8）接收信号

- 接收信号是什么时候才会接收？
- 对于 receive signal 最关心的就是接收 signal 或者去收这个 signal 的时间点
- 是当这个Kernel返回，从一个 exceptional 返回到你的用户进程的时候，在这个时候会去检查一下signal，所以你可以认为这个 signal 的这个邮箱就是在挂在你这个用户态的这个门口。
- 例子：当一个程序正在执行，你给他发signal，他是不会处理你的，因为他忙着执行自己，当他被打断进入到Kernel，进Kernel了之后会再回，你不知道回到哪，当某一次回到这个进程的时候，这个进程才会去检查，才能看到这个 signal 这样一个情况。
- 这时候，才会检查有哪些信号该处理。假如有10个信号待处理，那会处理多少，取决于操作系统，并不是一次全部处理掉，当然一般都是从小的开始处理

![截屏2023-05-13 21.41.13](./4-Signal.assets/%E6%88%AA%E5%B1%8F2023-05-13%2021.41.13.png)

#### 9）接收信号的处理

- handler默认的处理有四种逻辑：
  - 第一种就直接结束程序，直接挂掉
  - 另外一种情况下，挂了之前还会 dump 一下就是把它的内存的状态输出来，有时候一些调试的情况之类的，但程序还是被 terminate 了，因为程序执行不下去了。
  - 还有一种情况就是stop，比如说你发了一个 sig、 stop 给他，他会 suspend 停在那边，停在那边
  - 还有一种就是ignore
- 我们可以覆盖这些默认的处理行为！但是有两个注意，有两个 system call 是不能被覆盖的，sig KILL不能被覆盖，sig STOP也不能被覆盖，要挂起进程
- 要注册一个Handler，只需要用下面的函数，传递处理的信号和处理信号的函数

```c
#include <signal.h>
typedef void handler_t(int)
handler_t *signal(int signum, handler_t *handler)
//returns: ptr to previous handler if OK, SIG_ERR on error (does not set errno)
```

- 这个函数返回原来的handler是什么！
- 如果设置为`SIG_IGN`，那么处理函数就会忽略，什么都不做
- 如果设置为`SIG_DFL`，那么处理函数就会按照默认的处理逻辑
- 当然也可以设置为自己的函数，注意和这个函数不会有返回值，没人关心handler返回什么，执行完成就返回主线程了
- 安装handler需要在函数的一开始里面就执行，毕竟你不知道什么时候signal 过来，所以你要提前做好准备
- handler执行在用户态它还是一个用户的程序。

#### 10）SystemCall执行中断

- 当你收到一个 signal 的时候再返回去原来的执行的点的时候，如下图里面的（1）号位置可能是执行了Read或者Write的SystemCall。 因为要读取内存，所以可能进程被挂起来了。读一半的时候，Sig来了，当然肯定是在Kernel状态此时。Kernel发现这个 signal 是发送给 b 的，很有可能就会去调度到 b 进程
- 如果调度了B进程，这个 signal 的这个 handler 被处理完了之后，要回去的话，回到这个点是一个 SystemCall执行到一半的点，这个 read 不是还没执行完吗？
- 所以这个时候就有两种可能可以作为选择：
  - 一种是由这个系统帮助你恢复这个read，被打断了之后你继续读也可以，
  - 另外一种直接忽略了，Read不读了
  - 现代的操作系统都是第一种方法，会恢复。老系统可能会挂。所以一些代码可能在老机器会寄
  - 总之记得检测SystemCall的返回值

![截屏2023-05-13 21.41.13](./4-Signal.assets/%E6%88%AA%E5%B1%8F2023-05-13%2021.41.13.png)

- 如下图所示，当程序进入到内核态的时候，执行完成SystemCall，然后返回到用户态的时候，就会检查Signal的情况，如果发现了收到了信号，并且是用户自定义的处理函数，就会回到用户态
- 用户态执行handler(用户自定义的函数)，然后执行结束之后，有两种选择：
  - 一种是本来就在用户态，那我直接回到主线程的执行流就好了！但是现在系统都不用这种，不好
  - 另外一种，再返回到内核态，然后检查执行完成的状态，然后再返回到用户态，接着之前的执行流

![截屏2023-05-13 22.11.26](./4-Signal.assets/%E6%88%AA%E5%B1%8F2023-05-13%2022.11.26.png)

#### 11）Block和Unblock

##### a）默认的Block

- 当前的系统，它采用的是嵌套执行。当你去执行一个 signal 号的时候，默认会把当前 signal 号 block 住
- 为什么：假如我在执行用户的hanlder的时候，又进去执行了SystemCall，然后就会进入内核态、出来内核态，出来的时候发现又收到了信号，这样就会出现套娃现象，死循环执行
- 如下图所示，在执行handler（处理S信号）的时候，收到了信号T，然后发生了系统调用，返回用户态的时候就又会触发T的handler，这样执行流如下图（并没有问题）
- 这是S和T不相等，如果S和T相等，那么一个函数被执行了两次，这个函数被重入了。如果这个函数里面有锁、修改全局变量，就会出现大寄！危险！只有这个函数是**可以重入的**，才能可靠的执行
- 所以，默认情况下，当执行S信号的handler的时候，就会**默认屏蔽掉S的信号**！（Linux默认的）只有执行完成后，Unblock信号S，然后如果发现又有信号来了，再执行。
- 为什么不Block所有的，没有必要，如下图的例子，并不会出现问题

![截屏2023-05-13 22.19.08](./4-Signal.assets/%E6%88%AA%E5%B1%8F2023-05-13%2022.19.08.png)

##### b）主动的Block

- 上面的例子是隐式的Block，用户可以主动Block。这是因为应用程序的一些需要，比如说什么情况，有的时候你不想子进程打扰你，

```c
#include <signal.h>

// sigprocmask 函数改变当前阻塞信号的集合
// how为SIG_BLOCK：把set中的信号添加到blocked中
// how为SIG_UNBLOCK：从blocked中删除set里面的信号
// how为SIG_SETMAK：block=set
// 如果oldset非空，blocked之前的值就会保存在oldset里面
int  sigprocmask(int how, const sigset_t *set, sigset_t *oldset)
  
// 清空set
int  sigemptyset(sigset_t *set) ;
// 全部阻塞
int  sigfillset(sigset_t *set);
// 增加某个阻塞的
int  sigaddset(sigset_t *set, int signum);
// 删除某个阻塞的
int  sigdelset(sigset_t *set, int signum);
// Return: 0 if OK, -1 on error

// 如果signum是set的成员，就是1，如果不是就是0，出错返回-1
Int  sigismember(const sigset_t *set, int signum);
// Returns: 1 if member, 0 if not, -1 on error

```

