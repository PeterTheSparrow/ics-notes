---
title: 第一节 并发
sidebar_position: 1
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-12-con.ppt"/>

## 第一节 并发

> 上节课我们把网络编程部分其实介绍完了，实现网络程序和普通的应用程序的主要差别就在于，网络程序它涉及到 client 端和 server 端通信的两端，它并不一定是一个人写的这个程序，所以它们之间需要建立一些规范。例如HTTP。
>
> 剩下来内容介绍并发程序的编程，因为现在的随着你这个硬件里面这个计算能力的它的这个横向的一个扩展，硬件里面会有很多相同的这个能力的这样的一些单元，可以去并行的去做些事情，例如我们介绍WebServer的时候需要去服务多个client，但是我们之前给出的所有例子，你会发现它都是服务完一个 client 之后切换到下一个 client 去执行。
>
> 那么我们机器上面有多个核，能不能把它们都利用起来

### 一、并发

#### 1）并发的场景

- 硬件中断的Handler
- Processes：之前我们学的多进程，或者写的TinySheel的应用程序
- –Unix signal handlers

应用程序级并发很有用，例如

- 响应异步事件（我明明在做一些事情，这时候一个 signal 来了，有人要打扰我，这个下面的 child 这个进程退出了之后要我去回收。那么就是可以通过这种并发的编程，它可以实现一些异步的事件的这个处理，在你做主线的同时，同时兼顾其他事情）
- 在多处理器上并行计算（充分利用计算资源）
- 访问慢速I/O设备（如果只有一个执行流，就卡在那了，那我要是并发就能更快）
- 与人类交互（等用户反馈的时候，又可以做别的事情，用户输入可能要很久）
- 通过推迟工作减少延迟
- 为多个网络客户端提供服务

#### 2）并发的概念和方法

- 并发编程：在应用程序层面的并发
- 基本的方法有：
- Processes、Threads、I/O multiplexing

#### 3）并发的困难

- 人的思路在设计多线程的时候不好设计
- 调试很麻烦、debug困难
- 会有一些经典的问题，比如死锁，两个人同时尝试拿到锁。

#### 4）顺序执行的缺点

- 还是以我们的Webserver为例子。我们之前实现的那个要是遇到多个客户端在尝试链接的时候，第二个客户端就会在那里等第一个，会一直阻塞在那里。

![截屏2023-04-29 10.38.50](./1-Concurrency.assets/%E6%88%AA%E5%B1%8F2023-04-29%2010.38.50.png)

- 所以我们需要并发，可以分化出很多执行流，每一个客户端来了之后都分化出执行流，然后就可以了

### 二、并发解决方案

#### 1）进程

- 那么我们可以用Process来实现多进行，当有一个客户端来了之后，我就创建一个child-fd，然后父进程马上可以等待下一个链接，这样就很快

![截屏2023-04-29 10.45.13](./1-Concurrency.assets/%E6%88%AA%E5%B1%8F2023-04-29%2010.45.13.png)

- 值得注意的是：

```
Signal(SIGCHLD, sigchld_handler);
```

- Child的处理器需要回收僵尸子进程。而且会看到多次connectFD。因为父子进程在拷贝的时候，内存空间完全拷贝的。所以要关闭不必要的

```c
int main(int argc, char **argv) 
{
   int listenfd, connfd;
   struct sockaddr_in clientaddr;
   socklen_t clientlen = sizeof(clientaddr);

   Signal(SIGCHLD, sigchld_handler);
   listenfd = Open_listenfd(argv[1]);
   while (1) {
      connfd = Accept(listenfd, (SA *) &clientaddr, &clientlen);
      if (Fork() == 0) { 
         Close(listenfd); /* Child closes its listening socket */
         echo(connfd);    /* Child services client */
         Close(connfd);   /* Child closes connection with client */
         exit(0);         /* Child exits */
      }
      Close(connfd); /* Parent closes connected socket (important!) */
   }
}
```

- 我们这样的模型是依赖于操作系统来调度这些进程的执行，
- 优点：逻辑清晰，可以提供多进程的服务
- 缺点：每个进程都有自己的空间，父子进程交互不了，只能通过sign通信，非常的麻烦不合适。这个模型是比较清楚的，难点就在于你要去实现这些辅助的程序：handler、资源回收、各种问题。共享困难，比如想要统计客户端传递了多少数据，很麻烦。可能可以通过IPC来实现进程间通信、最大的问题：开销大，每次都拷贝了内存、Code段，开销太大了成本。

#### 2）线程

- 进程的模型如下所示

![截屏2023-04-29 10.55.16](./1-Concurrency.assets/%E6%88%AA%E5%B1%8F2023-04-29%2010.55.16.png)

- 我们希望把进程做一个更细粒度的划分，让进程里面可以有多个控制流。怎么办？

![截屏2023-04-29 11.00.30](./1-Concurrency.assets/%E6%88%AA%E5%B1%8F2023-04-29%2011.00.30.png)

- 如上图所示，为什么需要stack？因为不同的执行流可能会调用不同的函数，栈帧都不一样，所以每一个子的控制流需要有自己的stack，此外子执行流还需要有自己的SP、PC、条件码、寄存器数据之类的。但是进程里面的Kernel Context可以分为VM Structure、描述符表等等的在创建多个执行流的时候不需要拷贝，不需要单独存一份自己的数据
- 所以线程是进程一个轻量的抽象，包含自己的上下文和Stack。他们可以共享内存空间、程序的代码段。我们要实现并发就可以创建多个线程，他们公用一份代码段
- 所以现在，每一个进程被创建的时候，都有一个main Thread，我们可以创建多个thread。他们都会共享一个全局变量，这样就方便了多个控制流的共享通讯
- Thread和Process优点区别：两方面
  - 一个方面是它的创建，只需要创建一个进程的一部分，所以它的 over head 比较小。
  - 第二个就是在这些 thread 之间共享数据，或者互相通信交流，就通过我写变量，因为他们的全局变量都是共享的。
  - 下图展示了多个进程和线程的区别

![截屏2023-04-29 11.07.21](./1-Concurrency.assets/%E6%88%AA%E5%B1%8F2023-04-29%2011.07.21.png)

- 但是线程的缺点就是：隔离力度变小了，多个线程都能改全局变量，出现Bug的时候就更麻烦了。
- 编程接口Pthreads库，用这些库可以实现多线程

```c
/* hello.c - Pthreads "hello, world" program */
#include "csapp.h"

/* thread routine */
void *thread(void *vargp) {
  printf("Hello, world!\n"); 
  return NULL;
}

int main() {
  pthread_t tid;
	// 创建一个线程(第一个是线程id、第二个是线程的属性、第三个是掉用的函数
  // 第四个是传递的参数变量
  Pthread_create(&tid, NULL, thread, NULL);
  // 类比waitPID，等待tid的线程执行完成，第二个参数是退出的状态码
  Pthread_join(tid, NULL);
  exit(0);
}
```

- 有了Pthread，我们可以进一步的完善我们之前写的webserver

```c
int main(int argc, char **argv){
    int listenfd, *connfdp
    socklen_t clientlen;
    struct sockaddr_in clientaddr;
    pthread_t tid;

    if (argc != 2) {
        fprintf(stderr, "usage: %s <port>\n", argv[0]);
        exit(0);
    }
    listenfd = open_listenfd(argv[1]);
    while (1) {
        clientlen = sizeof(clientaddr);
      	// 特别注意这一段代码：必须要重新分配空间
      	// 之前我们的connfdp是个全局变量，现在必须要给每个线程开一个对应的connectFD
      	// 不然在并发的情况下，后面一个connectFD就把前面的覆盖了
        connfdp = Malloc(sizeof(int));
        *connfdp = Accept(listenfd,(SA *)&clientaddr, &clientlen);
      	// 创建一个线程去服务
        Pthread_create(&tid, NULL, thread, connfdp);
    }
}
```

- 处理之后，就把connectFD拿到

```c
/* thread routine */
void *thread(void *vargp)
{
    int connfd = *((int *)vargp);
		// detach 自己执行完自己退出，不需要mainThread
  	// 哪怕mainThread执行完成了，这个线程也可以继续执行！！
    Pthread_detach(pthread_self());
  
  	// 记得释放空间
    Free(vargp);
    echo(connfd);
    Close(connfd);
    return NULL;
}

```

- 线程有两种，一种是detached线程，一种是joinable线程

- joinable需要被其他的线程回收或者杀死，必须要依靠其他的线程

- Detached thread 会自动的释放空间

- 默认情况下，线程都是joinable类型的

- 我们有 thread 概念了之后，操作系统是以线程为调为力度进行调度的管理的，这样也就使得你的这个程序才能够真正的并行。每一个进程如果是一个顺序执行流，实际上是一个main线程

- thread会被操作系统可能调度到多核心的CPU执行，所以不能对于多线程的情况做任何的假设

- 进程创建需要20K的CPU cycle，但是线程创建开销需要10K。其实进程创建已经做了不少优化了，比如CopyonWrite机制。

#### 3）multiplexing

- 进程：如果你开饭店的，那么有很多客人，那你想扩大经营怎么办？进程的方式是你在旁边又开了一家店，里面这个桌椅板凳、都需要复制一份，开销很大
- thread 相当于什么呢？类比在原来的饭店里面放了更多的桌子
- IO multiplexing 是什么呢？它相当于你雇了一个比较能力强的服务员，然后这个一个客人来了之后，他把他迎进来，从门口把他迎进来到这个桌子上面去点菜之类，然后第二个客人来了，他这边点菜完了，他不会一直点菜，他就可以跑过去服务那一个那一桌人

```c
#include <sys/select.h>

int select (int maxfd, fd_set *readset, 
                NULL, NULL, NULL);
// Return nonzero count of ready descriptors, -1 on error
```

- maxfd：监听小于maxID的范围里面的IO
- readset：在函数调用过程中，有哪些人在试图点菜（因为可能在处理别的事情，处理的过程中可能会被别人需要叫，还是类比点菜）或者说我们要监听哪些IO的描述符，一旦某个IO准备好了（比如，STD IO被用户输入了回车，就会Ready）
- 返回值，返回了多少人叫了他，

````c
FD_ZERO(&read_set);
		// 设置只监听两个文件描述符的IO
		// 分别是本地的IO和网络的IO
    FD_SET(STDIN_FILENO, &read_set);
    FD_SET(listenfd, &read_set);
    while(1) {
        ready_set = read_set;
      	// 函数执行到这里会阻塞（当IO 准备好了之后就会退出
        Select(listenfd+1, &ready_set,
               NULL, NULL, NULL);
        if (FD_ISSET(STDIN_FILENO, &ready_set)
            /*read command line from stdin */
            command();	
        if (FD_ISSET(listenfd, &ready_set)){
            connfd = Accept(listenfd, 				        (SA *)&clientaddr, &clientlen);
            echo(connfd);
        }
    }
````

- 所以这个的并发就比较弱，它只能在 IO 这边实现 FD 级别的这个并行，每个 FD 代表不同的任务，它可以并行去做

### 三、对比三种方案

#### 1）I/O Multiplexing

- 从我们编程视角来看，它依然是一个单线程的执行，指令就是从编程视角来看，方便Debug
- 因为我们没有用到 process 和 thread 这样的，意味着我们在去处理这个 client 这个请求的时候，它的性能会更好一些。
- 缺点代码量比较看起来复杂来了很多，没有充分利用硬件里面的，很容易出发一个Block的情况。在上面的例子可能会因为一个 client 的 blocking 导致整个 server 它都卡在那里而不能去响应别的client。（因为我们本质是单线程）

#### 2）进程

- 共享资源困难，因为每个进程彼此之间是独立的，他们地址空间都是分离的
- 好处就是：一些隐藏式的错误不容易发现
- 缺点就是创建进程开销大，性能开销大

#### 3）线程

- Debug困难，没办法控制哪个线程先运行，可能需要加锁
- 优点更加轻量级
