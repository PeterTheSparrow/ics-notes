---
title: 第三节 Wait
sidebar_position: 3
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-3-wait.ppt"/>

## 第三节 Wait

> 这节课我们关注的是你在创建进程了之后，进程结束了之后会怎么做。最后简介一个Shell的代码。

### 一、回收子进程

#### 1）僵尸进程

- 僵尸进程：程序里面退出了之后，到他真正被回收之间的这个过程，我这个状态我们称为僵尸进程
- 当程序处于僵尸进程的时候，程序使用到的它的资源并没有马上被回收，这些资源包含代码段等等，可能还包括打开的文件描述符。包括malloc 动态分配的内存，也不会被回收，因为他怕可能你还有一些gdb这样类似的程序，还在检测相关的内存区域的状态
- 默认情况下，一个僵尸进程都是被他的父进程回收的。
-  parent 这个什么时候去回收这个子进程？如果父进程显式的申明等待子进程退出，那就会回收
- 假如我父进程不回收那会怎么办？一般来说，如果父进程没有回收子进程然后直接推出了，有三种可能
  - 父进程的父进程，比如shell一段时间后本身就会主动去回收僵尸进程。
  - 此外，如果长期没有被回收的僵尸进程，init进程也会回收
  - init的进程PID是1，是被系统初始化的时候，内核创建的一个进程
- 那能不能就不回收？不行！假如是一些服务器的进程，长期运行，如果进程一直执行，长期不回收，那就会出大问题。避免资源泄露

#### 2）回收API

- 我们回收有下面几个函数，其实wati会调用waitPID

```c
#include <sys/types.h>
#include <sys/wait.h>
pid_t waitpid(pid_t pid, int *status, int options);
pid_t wait(int *status);
// Returns: PID of child if OK, 0 (if WNOHANG) or -1 on error
```

- WaitPid每次只能回收一个子进程，如果返回- 1 就代表了出错
- pid参数：代表你想要回收哪个子进程，如果pid=-1，代表我要想看一下现在有没有僵尸进程，如果有我就回收，我就可以给pid=-1，回收谁都可以。
- 返回结果：
  - 如果没有子进程，也会出错，返回-1，errno设置为ECHILD
  - 如果被signal打断了，也会出错，返回-1（什么情况？假如父进程调用了waitPid，但是子进程还在执行，那么父进程就一直阻塞在那里，但是如果此时有收到什么打断的信号，那就会返回-1，代表回收失败）
- OPTIONs
  - 默认情况下这个 option 是0，waitPID会挂起当前的调用进程，等待有子进程退出。假如我调用之前就有子进程退出了怎么办？直接回收！马上的返回！
  - WNOHANG：函数立即返回，不要等待。没有回收到，就返回0
  - WUNTRACED：增加函数返回的条件，原来是回收的目标进程终止了，才返回。现在是终止了或者阻塞了stopped都可以返回
  - 上面两个选项是可以组合在一起的
- status
  - 包含一些特殊的信息，包含子进程的一些信息
  - `WIFEXITED`：返回是否是正常退出的
  - `WEXITSTATUS`：在正常退出的前提下，返回退出的状态码
  - `WIFSIGNALED(status)`：子进程是否是被信号打断而 **终止** 的
  - `WTERMSIG(status)`：如果上面的结果是yes，返回是什么信号终止了这个进程
  - `WIFSTOPPED(status)`：返回子进程是否是 **STOP阻塞** 的
  - `WSTOPSIG(status)`：如果被STOP了，返回是什么信号导致阻塞的

#### 3）sleep

```c
#include <unistd.h>
unsigned int sleep(unsigned int secs);
		// Returns: seconds left to sleep
int pause(void);
		// Always returns -1
```

- sleep：sleep 就会进入休眠，当前的主进程把自己挂起，leep 后面加上了多少秒相当于睡多少秒。这是一个系统调用，操作系统过了多少秒之后来叫醒你，向你发送一个signal。这个时候你会从 sleep 里面退出。 正常返回的是0。但是如果你的程序被打断了，你的 sleep 提前被人叫醒，回值就是剩下的秒数没有睡的
- pause：相当于sleep正无穷秒，直到被叫醒。而且永远返回-1。

### 二、加载执行Process

- 要执行一个新的程序，怎么办？它牵涉到加载和运行，加载做些什么事情？你可以简单理解，你在执行一个程序的时候，其实是用了它的这个二进制的文件的名字，在 shell 里面二进制名字加参数来回车，这个时候其实操作系统或者说上面的这个 shell 会去找到这个文件，然后把这个文件加载到操作系统给你创建的这个进程里面。
- 具体来说，加载一些代码，你的数据，还要为你准备好，比如说栈、共享库，才能够进行执行。
> 那么，怎么让父进程去执行一个`bin/cat`这样的程序呢？
> - 一般情况下步骤是这样，主进父进程先 Fork 出一个子进程，然后让子进程去调用EXECV，
> - 子进程先会擦掉原来所有的信息（因为他fork了父进程的一些东西）这个时候他就调用 Execv execute 这个 virtual environment，把旧的东西擦掉，根据你提供的这个文件二进制文件完成加载，这个子进程就摇身一变就变成了一个可以执行你这个代码的这个程序了。
> - Exev 和 folk 很有意思，它是相对的，Exev它特点是一次调用从不返回。除非执行出错，比如文件不存在、没有权限什么的

```
#include <unistd.h>
int execve(const char *filename, const char *argv[], 
		const char *envp[]);
does not return if OK, returns -1 on error
```

- 第一个是文件名或者路径，第二个是参数，第三个代表环境变量
- 那么，操作系统会干什么呢？第一个找到这个可执行的文件，看看找不找得到，找到了之后你有没有权限
- 都满足的情况下，他要负责做一个加载，在加载之前它会根据你的命令行去生成这个参数，用空格来作为分隔符之类的
- 然后准备环境变量的东西
- 整个虚拟地址空间的一个清理，把原来的程序去清掉，然后把这个 file name 里面编译出来的text、data拷贝
- 然后把PC修改到新的程序

![截屏2023-04-17 22.30.05](./3-Wait.assets/%E6%88%AA%E5%B1%8F2023-04-17%2022.30.05.png)

- 如上图所示，指向的都是数组，数组里面都是指针，然后指向对应的字符串
- 栈的结构如下所示
- 最上面相当于把所有的参数、环境变量的字符串数组拼接在一块，可能用`\n`什么的分割来，放在最上头，然后通过指针某个变量或者什么开头的地址就好了，这样就可以高效存储长短不一的字符串

![截屏2023-04-17 22.35.01](./3-Wait.assets/%E6%88%AA%E5%B1%8F2023-04-17%2022.35.01.png)

- 当然可以通过一些函数获取或者设置环境变量

```c
#include <unistd.h>
char *getenv(const char *name);
// Returns: ptr to name if exists, NULL if no match.
int setenv(const char *name, const char *newvalue,int overwrite);    
// Returns: 0 on success, -1 on error.
void unsetenv(const char *name);
// Returns: nothing.
```

### 三、编写自己的shell

- shell是一个交互的应用程序，它会等待你输入。但是它是一个 application level 的这个程序。
- 常见的有shell有c shell、bash什么的
- shell会包括Read和Evaluate
  - Read读取命令行
  - Evaluate解析行的命令，代表用户执行程序

```c
int main()
{
   char cmdline[MAXLINE]; /* command line */

   while (1) {
     /* read */
     printf("> ");
     // 有的时候可以用文件重定向，
     Fgets(cmdline, MAXLINE, stdin);
     if (feof(stdin))
       exit(0);

     /* evaluate */
     eval(cmdline);
   }
}
```

- 前台和后台运行的区别
  - 前台运行输出直接会在这个控制台上面显示出来
  - 后台就不会输出出来，不影响你的这个控制台这个 shell 的主的运行的，你可以输入后面的指令了（添加&符号）
- 如果是内置的命令，相关的函数会处理
- 问题：这个shell可能按ctrl+C整个shell就会挂了，怎么解决？学习后面的signal。

