---
title: 第五节 Signal实现
sidebar_position: 5
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-5-signal2.ppt"/>

<OfficePreview place = "/ppt/3-6-ljmp.ppt"/>

## 第五节 Signal实现

> 本章节介绍如何实现一个SignalHandler。我们要强调一个Safe。

### 一、实现原则

#### 1）并发的Bug

- 并发程序的Bug非常的难调试，可能大多数时间能够正常运行，但是偶尔几次挂了
- 非常的Tricky，而且微妙
- 当程序挂了，可能因为不可预料的原因。比如涉及到并发、操作系统的调度，这些都是不可控制的原因。
- 非常难的Debug，因为能够复现一次非常的难。假如你加入了打印日志，可能打印日志也会占用时间，所以也可能导致bug跑不出来。GDB会阻止程序的执行，很难调试。
- 目前唯一的有效的办法：CodeReview，手动检查Bug的发生
- 比如说是一个执行流，这边是分配空间，另外一个地方可能会去访问这块空间，当分配先分配了，再访问你的程序就对了，如果先访问，那就直接内存出错了
- 因为Signal会引入并发，所以就会出现问题

#### 2）实现注意原则

##### a）保持程序尽可能简单

简单是两方面来考虑的。第一个简单它会执行的相对比较快，如果你的这个 signal handle 的这个程序执行的足够快，那么它发生发生问题的可能性也会少一些。第二个原因，你把写的简单了之后，你涉及到的问题会少一些，全局变量，你尽量不要访问他。

- 比如收到sig child的时候，你可以在里面直接调度 wait 去回收它，但是回收的时候它牵涉它是一SystemCall，时间很长。所以你可以设计一个标记，然后返回到主函数里面再处理回收
- 这个只是建议，但是后面的就是必须要遵守的了，不遵守就会大寄！

##### b）异步信号安全函数

- 这样函数一般可以有几种？第一个要么它是 reentry 的，可以重复进入的，或者说你这个函数不会被打乱的，不会被 interrupt 的，他为什么会这样呢？就是你担心的是，调用sig handler的时候，你虽然实现的很简单，但是如果你调了一个函数，这个函数实现比较复杂，时间还是比较复杂。
- 例如，printf, sprintf, malloc, exit 都不是安全的

> 为什么不安全？为什么会带来问题
>
> - `printf`函数：如果大家都想在屏幕上面打印怎么办，在屏幕上打印的之前，它其实是会去拿一个类似锁的东西，要获得这个权限来往屏幕上面打东西，防止和别人产生交错等等一系列问题。
> - 这样如果你的`main`函数你的signal handler都有可能调用 printf，当你在调 printf 的时候，被打断 content switch 了，再回来，你再执行这个 signal handle了，然后再handler里面执行printf的时候，就会大寄！直接就出现了死锁，程序就跑不动了

- 为什么同时需要sync safe的和unsafe的？
- 一个版本是比较快的，一个版本是可能功能性比较强的，在以保证安全的情况下，你当然会去调这个速度快的。
- 所以不要在handler里面包括了unsafe的函数！一旦调用了，自己也是不安全的，这个是具有传染

##### c）保存并恢复errorno

- 在handler里面，需要保存并恢复errorno！
- 举个例子，假设main函数调用了一个system call，然后调用之后就阻塞了，然后从内核态返回用户态的时候，触发handler的执行，然后执行handler的时候，又调用了system call（执行结果是把errorno设置为errornoY），然后返回回来的时候，假设又发现了另外一个信号来了，然后又执行这个信号的handler2，里面假如又有system call2，修改了errerno为errornoX，然后返回到handler的时候，读取到是errornoX，所以就相当于丢失了原来的errorno！
- 所以为了避免自己的system call修改了errorno这些全局变量，需要**handler主动保存，然后执行完成后恢复原来的errorno的状态！**
- 不要忘记一些隐式的全局变量

#### 3）例子

- 下面的代码有问题，你会发现可能创建三个进程，可能用下面的handler处理sig_child的时候，可能只回收了两个！

```c
void handler1(int sig)
{	
  		// 一定要保护好errorno！
    	int olderrno = errno;

    	if ((pid = waitpid(-1, NULL, 0)) < 0)
          sio_error("waitpid error");
    	sio_puts("Handler reaped child\n");
  		sleep(1);
   		errno = olderrno ;
}

```

- 然后查询就会发现，子进程已经处于僵尸状态，子进程明明退出了！但是没有被回收？为什么
- 因为子进程退出的时候，会发送sig_child，如果发送信号的时候，父进程正在忙碌，然后连着两个sig_child信号都来了！这下就有一个信号被丢失了【仔细看：sleep故意拉长了函数的时间】
- 所以解决方法就是：只要收到了信号，就说明一定有子进程退出了，那我就回收所有的退出的进程就好了。修改之后的代码采用一个循环结构等待，回收所有的存在的僵尸进程，直到没有可以回收的。

```c
void handler2(int sig)
{
    	int olderrno = errno;

    	while ((pid = waitpid(-1, NULL, 0)) > 0) {
 	    	sio_puts("Handler reaped child\n"); 
  		}
    	if (errno != ECHILD)
         sio_error("waitpid error");
 			sleep(1);
   		errno = olderrno ;
}
```

#### 4）可移植的程序

- 有的程序可能在老一点的系统、机器上面运行可能就会出现错误。
- 我们知道SystemCall比较慢，system call 比较慢了之后，我们当然会采用一些方式，Context switch，调换出去执行其他的程序，采用异步方式是它最常用的方式。system call最容易和system handler产生联系。因为signal handler的处理要求就是从Kernel返回到用户态，而system call给了你这机会。那么system call本身就会被你这些handler东西打乱，因为system call已经在执行了
- 比如说你的一个read，那你背后正在读（虽然不是主程序在读，但后台在读，但是signal来了之后会打断你system call的这个执行，会使得system call提前返回）比如read和write提前返回
- 老的系统里面，如果提前回来了，就交给应用程序自己处理，比如要读取100个，但是只读取了20个，提前返回了，需要用户自己处理
- 但是新的系统里面，系统会自动恢复，如果只读取了20个，会自动恢复，尝试执行完

```c
   /* Manually restart the read if it is interrupted */
   while ((n = read(STDIN_FILENO, buf, sizeof(buf))) < 0)
     if (errno != EINTR)
       unix_error("read");
```

- 如果发现被打断，就报错，所以为了适应不同的环境，代码变复杂了！效率也降低了

#### 5）可移植的程序处理

- 为了更好的解决可移植的函数的问题，我们可以引入一些函数，让他们帮我们做好这些处理逻辑。

```c
#include <signal.h>
int sigaction(int signum, 
               struct sigaction *act, 
               struct sigaction *oldact);
// returns: 0 if OK, -1 on error

struct sigaction {
  void (*sa_handler)();/* addr of signal handler,or SIG_IGN, or SIG_DFL */
  sigset_t sa_mask; /* additional signals to block */
  int sa_flags;/* signal options */
} ;
```

- 如下图所示的，`sigaction`用来注册一个函数，并添加上要阻塞的信号，此外！`sa_flag`可以加一些额外的参数。有一个叫做**SA_RESTART**，可以用来就是代表你是不是由操作系统来恢复这个被打断的 system call，你可以设置成restart，要作系统帮你来恢复，如果可能的话。
- 这时候如果运行在老系统，不能自动恢复，那就会报错。这样也方便debug和检查错误。那这时候出错就会在这个函数一开始的时候就会报错。注册的时候就会告诉不支持

### 二、复杂的并发Bug

> 我们把功能变得复杂一些，要去记录你的子进程，要有个数据结构去管理当前子进程，随时查看有多少子进程。

#### 1）Bug代码

假设我们有下面两个函数：

```c
void addJob(job newjob);
void removeJob(job oldjob)
```

这两个函数对应一个链表，维护里面的任务的内容。

- 如下面的代码所示，当我创建了一个进程之后，就把他添加到任务里面
- 当我收到一个进程终止之后，我就把他从job里面删除

```cpp
/* WARNING: This code is buggy */
 void handler(int sig)
 {
     	int olderrno = errno ;
     	pid_t pid ;

     	while ( (pid = waitpid(-1, NULL, 0) > 0)) > 0) {  
        			/*reap a zombie child */
       	      deletejob(pid);     
        			/*delete the child from the job list*/
    	}
     	if (errno != ECHILD)
      	      sio_error(“waitpid error”) ;
    	errno = olderrno ;
} 
int main(int argc, char **argv){
  		int pid;	
 
			Signal(SIGCHLD, handler);
    	initjobs(); /* initialize the job list */

     	while(1) {
				if ((pid = Fork()) == 0) { 
          	/*Child process */
          	Execve(“/bin/ls”, argv, NULL);
 	      }
				addjob(pid) ; /* Parent process adds the child to the job list */
			}
     	exit(0)
}

```

上面的代码有Bug。为什么？当子进程执行完了，假如父进程还没有执行addjob，也就是说这个任务还没有被添加，就被删除，这个时候就会出现大问题。所以需要处理好共享变量。

所以我该怎么解决呢？关掉block。我在进入这个while循环体的时候，就要阻塞信号。避免收到了信号然后处理调用了handler。删除一不存在的任务。

#### 2）修复的代码

- 下面的代码还有Bug，因为还是可能出现问题，假如

```c
/* WARNING: This code is still buggy */
 void handler(int sig)
 {
     	int olderrno = errno ;
     	pid_t pid ;

     	while ( (pid = waitpid(-1, NULL, 0) > 0)) > 0) {  
        			/*reap a zombie child */
        			SigProcmask(SIG_BLOCK, &mask_all, &prev_all);
       	      deletejob(pid);     
        			SigProcmask(SIG_SETMASK, &prev_all, NULL);
        			/*delete the child from the job list*/
    	}
     	if (errno != ECHILD)
      	      sio_error(“waitpid error”) ;
    	errno = olderrno ;
} 
int main(int argc, char **argv){
  		int pid;	
 
			Signal(SIGCHLD, handler);
    	initjobs(); /* initialize the job list */

     	while(1) {
				if ((pid = Fork()) == 0) { 
          	/*Child process */
          	Execve(“/bin/ls”, argv, NULL);
 	      }
        // 如果执行在这里的时候，收到了handler！那就会删除一个不存在的job
        Sigprocmask(SIG_BLOCK, &mask_all, &prev_all);
				addjob(pid) ; /* Parent process adds the child to the job list */
        Sigprocmask(SIG_SETMASK, &prev_all, NULL);
			}
     	exit(0)
}

```

- 最终的修复的代码（索性在Fork之前就马上关掉）：

```c
void handler(int sig)
{
     	int olderrno = errno ;
     	pid_t pid ;

     	while ( (pid = waitpid(-1, NULL, 0) > 0)) > 0) {  
        			/*reap a zombie child */
        			SigProcmask(SIG_BLOCK, &mask_all, &prev_all);
       	      deletejob(pid);     
        			SigProcmask(SIG_SETMASK, &prev_all, NULL);
        			/*delete the child from the job list*/
    	}
     	if (errno != ECHILD)
      	      sio_error(“waitpid error”) ;
    	errno = olderrno ;
} 
int main(int argc, char **argv){
  		int pid;	
 			sigset_t mask_all, mask_one, prev_one ;
			
  		Sigfillset(&mask_all);
  		Sigemptyset(&mask_one);
			Sigaddset(&mask_one, SIGCHLD);

			Signal(SIGCHLD, handler);
    	initjobs(); /* initialize the job list */

     	while(1) {
        // fork之前速速屏蔽
        Sigprocmask(SIG_BLOCK, &mask_one, &prev_one)
				if ((pid = Fork()) == 0) {
          	Sigprocmask(SIG_SETMASK, &prev_one, NULL); 
          	// 子进程里面要速速解锁，不要block掉了
          	/*Child process */
          	Execve(“/bin/ls”, argv, NULL);
 	      }
				
        // 然后要注意，addjob的时候不能被任何的打断，不然添加一半链表没整好断开了
        Sigprocmask(SIG_BLOCK, &mask_all, &prev_all);
				addjob(pid); /* Parent process adds the child to the job list */
        Sigprocmask(SIG_SETMASK, &prev_all, NULL);
			}
     	exit(0)
}

```

### 三、显式的等待信号

#### 1）volatile定义

- 使用volatile定义变量！我们之前说所有的 global 变量都需要去 block 对应的这个操作。有的时候你可能 block 不了。还有一种情况是你是确实是需要这个共享的，对于这个共享的这个变量，一定不能放在寄存器里面！因为当你发生 content switch 的时候，寄存器这个东西是只有一份的，然后你可能会保存寄存器。
- 举个例子：假设我写了一个flag++，这代码有三个汇编指令。它先会把这个数据加载到寄存器里面，在寄存器里面做了操作之后再写回，它不会在你的内存上面直接做操作。假设M(内存的值为0)加载到寄存器rax，然后发生了context switch，然后回来的时候执行了handler里面的一个函数，这个函数把这个M(内存的值)读出来加加，然后这时候他的值是1。然后回到原来的执行流，完成++的后面的部分，最终的结果M（内存值为1），但是我们做了两次加法！大寄！
- 所以我们需要引入volatile变量，让他每次操作的时候，都从内存里面强制读取

#### 2）sig_atomic_t定义

- sig_atomic_t强制保证原子操作，保证三条汇编指令不会被拆解

#### 3）例子

下面的例子就是展示全局变量该怎么写：

- 当收到子进程退出的时候，把pid设置为退出的子进程
- 然后while循环的时候，pid因为是大于0的时候，所以就会进入到回收该进程的过程

```c
#include "csapp.h"

// 全局变量用volatile
volatile sig_atomic_t pid;

void sigchld_handler(int s)
{
 	int olderrno = errno;
	pid = waitpid(-1, NULL, 0);
 	errno = olderrno;
}

void sigint_handler(int s){}


int main(int argc, char **argv){
		sigset_t mask, prev;

		Signal(SIGCHLD, sigchld_handler);
  	Signal(SIGINT, sigint_handler);
  	Sigemptyset(&mask);
  	Sigaddset(&mask, SIGCHLD);
		
  	while (1) {
      	Sigprocmask(SIG_BLOCK, &mask, &prev); /* Block SIGCHLD */
      	if (Fork() == 0) /* Child */
        {
          	exit(0);
        }
      	/* Parent */
  	    pid = 0;
  	    Sigprocmask(SIG_SETMASK, &prev, NULL);/* Unblock SIGCHLD */
 
  	    /* Wait for SIGCHLD to be received (wasteful) */
  	    while (!pid)
  			;
 
  	    /* Do some work after receiving SIGCHLD */
  	    printf(".");

    }
}
```

- 但是这个代码浪费CPU！盲等待不好！我可以让没等到之后，我就休息一会。参考下面的代码

```c
while (!pid)     /* Race! */
		pause();
```

- 但是问题就出现了。假设在pause之前，发生了上下文切换，回来之后signal handler执行完成了。然后再进入pause之后，子进程已经退出了，没有人再给父进程发信号了，所以就卡死在这里了。
- 所以这里就有race condition！我们需要避免。
- 采用下面的方法，但是太慢了！：

```c
	while (!pid) /* Too slow! */
		sleep(1);
```

- 下面的这个API会把程序挂起，然后设置mask，然后再恢复。

```c
#include <signal.h>
int sigsuspend(const sigset_t *mask);
// returns: −1

// 是下面的 第一第二句是原子版本，然后第三句执行解锁恢复原来的mask
sigprocmask(SIG_SETMASK, &mask, &prev);
pause();
sigprocmask(SIG_SETMASK, &prev, NULL);
```

### 四、非本地跳转

> 所谓的non local jump指的是来的这个jump，都是在函数内的。你不管用 goto还是 brand 分支跳转，都可以。但是从汇编的角度来说，你可以随便往哪跳。这一般在上面的语言会表现成exceptional，如说在 C + + 里面或者 Java 里面，你会抛出一个exception，然后你可以在外层把它接住你的执行流

所以这就是个传送门。既然要做跨函数的调用，最难的地方在最大的问题就是从函数那些出来的地方，它的这个 content switch 出问题了。

所以我们来看两个API：

- set jump，就是树立一个传送门，你要知道我要从哪出来设好这个传送门，那么你在任何地方调用一个 long jump，就可以从这个 set jump 的地方出来。setjump会保存环境的上下文信息
- longjmp：一旦调用，就会从setjmp那里出来！好神奇的函数

```c
#include <setjump.h>
int setjmp(jmp_buf env) ;
// Returns: 0 from setjmp,  如果是第一次设置的时候，返回0
// nonzero from long jumps  如果后面从longjmp跳过来的，返回retval这个值
// 因为超过本书描述的原因，setjmp不能被赋值给变量！但是可以用在switch里面
#include <setjmp.h>
void longjmp(jmp_buf env, int retval);
// Never returns
```

- 然后还有下面的一套API
- 注意，如果要用信号处理函数，比如用sig开头的函数。如果 `savemask` 参数为 0，表示不保存信号屏蔽字的状态，否则表示保存信号屏蔽字的状态。一般都会保存

```c
#include <setjump.h>
// 第二个参数是被屏蔽的信号
int sigsetjmp(sigjmp_buf env, int savemask);
// Returns: 0 from sigsetjmp, nonzero from siglongjumps

#include <setjmp.h>
void siglongjmp(sigjmp_buf env, int retval);
// Never returns
```

