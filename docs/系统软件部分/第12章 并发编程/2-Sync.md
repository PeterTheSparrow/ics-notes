---
title: 第二节 同步
sidebar_position: 2
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-14-issue.ppt"/>

## 同步

### 一、多线程里面共享

#### 1）线程模型

- 每个线程它又拥有自己独立的这个 thread context，比如说我们刚才说的这个stack，然后 stack pointer 及PC，当然还有一个自己的一个 thread ID，这些都是独立的。然后我们说的寄存器。code、data、 heep 堆以及这个共享库，这些都是共享，以及这个打开的这些文件，包括还有这个，其实这个 signal handler 这种东西它其实都是共性。
- 但是其实每个线程可以访问别的栈：例如我把全局变量指向一个main函数里面的数组，然后通过全局变量访问。
- 局部变量存储在每个对应函数的栈区域里面，可以通过全局变量的指针，让别的线程访问。所以我们说每个线程确实是有自己的函数栈，但是也可以访问。进程并没有隔离线程的访问范围。

所以什么是全局变量、Local变量、static变量

- 全局变量：在函数外面声明的变量，对于这些变量，虚拟内存只包含了一个实例，存贮内存里面
- 本地变量：没用static声明的函数里面的变量，然后每个线程包含一个实例
- static变量：函数里面声明的static变量，整个虚拟内存空间包含一个这样的实例

什么是共享变量：

- 取决于有没有多个线程都访问，无论是全局变量、Local变量、static变量，只要被多个线程访问（比如通过指针访问）就是共享变量

#### 2）多线程例子

- 这个例子是开了两个线程，每个线程执行一个for循环，把一个全局变量cnt++
- 最终的结果不是200000000，因为哪怕最简单的cnt++在汇编里面也是多个指令

```c
#include "csapp.h"
#define NITERS 100000000
void *count(void *arg){
  int i;
  for (i=0; i<NITERS; i++)
    cnt++;
	return NULL;
}

/* shared variable */
unsigned int cnt = 0;


int main()
{
    pthread_t tid1, tid2;

    Pthread_create(&tid1, NULL, count, NULL);
    Pthread_create(&tid2, NULL, count, NULL);
    Pthread_join(tid1, NULL);
    Pthread_join(tid2, NULL);
    17
    if (cnt != (unsigned)NITERS*2)
      printf("BOOM! cnt=%d\n", cnt);
    else
      printf("OK cnt=%d\n", cnt);
      exit(0);
}
```

- cnt++对应的汇编是

```
movq cnt(%rip),%rdx # Load
addq %rdx           # Update
movq %rdx,cnt(%rip) # Store
```

- 所以两个线程在并发执行的时候，上面的三个指令并不是严格在一块执行的，所以最终执行的结果要小于200000000
- 我们把几个操作抽象为如下所示：

![截屏2023-04-30 11.21.40](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-04-30%2011.21.40.png)

- Unsafe区域一旦进入到这个里面，就会出现寄！线程同时访问全局变量，加法结果就会出问题
- 因为进入到Unsafe区域后，两个线程就会同时读取一个变量，最终写回去的
- （边界问题，即使在unsafe的边缘，就不怕了！）

![截屏2023-04-30 11.21.12](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-04-30%2011.21.12.png)

#### 3）Dijkstra's的信号量

- 通过上面的例子，那么我们就希望，不要让两个线程同时对于某个全局变量修改了。我们可以用信号量来实现
- 定义两个函数（我们假设这两个函数操作系统提供出来，确保是绝对的原子性的执行的，要目全部执行完，要目不执行）
- P(s): [ while (s == 0) wait(); s--; ]
- V(s): [ s++; ]

- 信号量相关的函数如下

```c
#include <semaphore.h>

// 你可能好奇过第二个参数sem_init函数为什么是0
// 这个参数的名字叫做pshared
// 如果 pshared 的值为 0，那么信号量将被进程内的线程共享，并且应该放置在这个进程的所有线程都可见的地址上(如全局变量，或者堆上动态分配的变量)。
// pshared 是非零值，那么信号量将在进程之间共享，并且应该定位共享内存区域
int sem_init(sem_t *sem, 0, unsigned int value);
int sem_wait(sem_t *s);  /* P(s) */
int sem_post(sem_t *s);  /* V(s) */

#include “csapp.h” 

void P(sem_t *s);	/* Wrapper function for sem_wait */
void V(sem_t *s);	/* Wrapper function for sem_wait */

```

- `s`就是信号量的大小，如果我们保证只能有一个线程范围，设置s值为1。一旦一个现场执行了P函数，后面的其他线程想要拿到信号量，就不可能！必须等待。只有当那个线程释放了锁，也就是说执行了V函数，其他的线程等待才会结束
- 这个图画出来了信号量的大小。确保了绝对禁止进入到危险的区域

![截屏2023-04-30 11.30.46](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-04-30%2011.30.46.png)

### 二、经典问题

#### 1）信号量

- 信号量有下面几种
  - counting semaphores：比如系统有10个资源，有100个线程并发执行，每个线程只能拿一个资源，我们就可以使用counting semaphores，把刚刚说的s设置为10，当s被减小到0的时候，其他的线程就会等待
  - binary semaphores：就是类比上面的例子，s=1，只能有一个线程访问
- 经典案例：生产者消费者问题、读者写者问题

#### 2）生产者消费者问题

- 问题概述：生产者消费者问题就是生产者往一个buffer生产东西，消费者从里面读取东西。Buffer里面大小是有限的。

![截屏2023-04-30 11.35.58](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-04-30%2011.35.58.png)

- 假设Buffer里面可以放很多东西，producer往里面放东西，每个东西是一个slot单位。Producer只有当Buffer有空位的，才能往里面放东西，他的操作就是把 item 往里面放到这个 buffer 的位置里面，然后他需要去通知consumer。（并不一定要直接通知，可能是通过信号量的值改变，然后Consumer自己就停止等待了）
- 速度的协调：东西没有生产出来，消费者就不能拿到。
- 读写的协调：写的时候你可能写了一半，写的不完整，那可能被读到就会有问题

##### a）Buffer长度1

- 从最简单的代码看

```c
#define NITERS 5

// NITERS代表总共生产者会生产多少个东西

struct {
  // Initially:  empty==1, full==0
  int buf; 	// 1 slot
  sem_t full; // buf里面慢的数量
  sem_t empty;// buf里面空的数量
} shared;


int main() {
  pthread_t tid_producer;
  pthread_t tid_consumer;

  /* Initialize the semaphores */
  Sem_init(&shared.empty, 0, 1); 
  Sem_init(&shared.full,  0, 0);
  /* Create threads and wait */
  Pthread_create(&tid_producer, NULL, producer, NULL);
  Pthread_create(&tid_consumer, NULL, consumer, NULL);
  Pthread_join(tid_producer, NULL);
  Pthread_join(tid_consumer, NULL);
  
  exit(0);
}

```

- 生产者代码：

```c
void *producer(void *arg) {
  int i, item;

  for (i=0; i<NITERS; i++) {
    /* Produce item */
    item = i;
    printf("produced %d\n", item);

    /* Write item to buf */
    P(&shared.empty);
    shared.buf = item;
    V(&shared.full);
  }
  return NULL;
}
```

- 消费者代码

```c
void *consumer(void *arg) {
  int i, item;

  for (i=0; i<NITERS; i++) {
    /* Read item from buf */
    P(&shared.full);
    item = shared.buf;
    V(&shared.empty);

    /* Consume item */
    printf("consumed %d\n“, item);
  }
  return NULL;
}
```

- 生产者、消费者谁先执行没有定律。PV分别为加锁、解锁
- empty、full的值设置如果错误，程序也会运行出错

##### b）Buffer长度N

- 如果Buffer的长度不是1，有多个，就很麻烦。比如生产者在放东西的时候，Buffer哪个地方是空的才能放进去，而不是随便放进去。拿的时候可能也得拿到有东西的位置。
- 最极端的时候是每一个位置用一个信号量保护，但是很不好！
- 用三个信号量来表示：
  - Mutex：Mutex信号量保证对于共享变量Buffer的操作，只能有一个人操作（避免两个人同时进行操作）
  - slots：Buffer里面的空的位置
  - items：存放了生产出来的东西的位置的个数
- 结构体(注意头和尾，如果头追上了尾巴，也就是front==rear的时候，说明空间已经满了，不能再塞了，在往里面塞东西就会爆炸！可以理解为一个循环队列，因为是把数组取了Mod)

```
struct {
  int *buf;     /* Buffer array */
  int n;	    /* Maximum number of slots */
  int front;    /* buf[(front+1)%n] is the first item */
  int rear;	    /* buf[rear%n] is the last item */
  sem_t mutex;  /* protects accesses to buf */
  sem_t slots;  /* Counts available slots */
  sem_t items;  /* Counts available items */
} sbuf_t;

```

- 初始化的时候slot是N、item是0（没有东西、全是空位）
- 生产者代码：

```c
void sbuf_insert(sbuf_t *sp, int item)
{
    /* Wait for available slot */
    P(&sp->slots);
    /*Lock the buffer */
    P(&sp->mutex);
    /*Insert the item */
    sp->buf[(++sp->rear)%(sp->n)] = item;
    /* Unlock the buffer */
    V(&sp->mutex);
    /* Announce available items*/
    V(&sp->items);
}
```

- 消费者代码：

```c
void sbuf_remove(sbuf_t *sp)
{
    int item;
    /* Wait for available item */
    P(&sp->items);
    /*Lock the buffer */			
    P(&sp->mutex);
    /*Remove the item */
    item = sp->buf[(++sp->front)%(sp->n)];
    /* Unlock the buffer */
    V(&sp->mutex);			
    /* Announce available slot*/ 	
    V(&sp->slots);			
    return item;
}
```

- 可以发现生产者总是往rear的尾部插入，然后消费者总是从head头部读取，然后head++
- 所以就可以理解为，head-rear之间是一个滑动窗口，生产者往尾部塞东西，扩充窗口，而消费者往头部读东西，减小窗口

> 为什么要Mutex?
>
> - 假如有多个生产者同时往里面塞东西，而且塞到了同一个位置，那岂不是大寄？所以对于共享变量Buffer，只能限制只有一个在读或者写

- 再看生产者的代码：P(&sp->slot);代码，每次要生产之前，把slot也就是空位减一，结束之后item（也就是full的位置数量）加一，这样正好让slot、item表示了整个buffer区域里面东西的状态。

> 思考Mutex能不能放在外层？
>
> ```
> void sbuf_remove(sbuf_t *sp)
> {
>     int item;
> 		P(&sp->mutex);
>     P(&sp->items);
>     item = sp->buf[(++sp->front)%(sp->n)];
>     V(&sp->slots);
>     V(&sp->mutex);
>     return item;
> }
> ```
> - 考虑这样一种情况，假如消费者先执行，先拿到了Mutex锁，但是这时候Buffer里面还没有任何有效的东西。那么消费者就卡死在那里了！然后生产者拿不到Mutex锁，也卡死在里面了。最终全部都卡死了。 

#### 3）读者写者问题

> 问题描述：
>
> - 读者线程只能读取对象
> - 写线程可以编辑对象
> - 一个对象被写入的时候，只能被一个对象写入（具有排他性）
> - 一个对象被读取的时候，可以被无限的对象读取
> - 这个问题在真实情况里面。比如机票预订、多线程的WebProxy里面都会出现

这个问题可以分两个类型：

- 读者优先（也叫做第一类读者写者问题）：不要让读者等待，除非使用对象的权限已经被交给了写者
- 写者优先（也叫做第二类读者写者问题）：一旦一个写者准备好可以写了，他应该尽可能快的就开始写（写者后面到达的读者必须等待，哪怕写者自己也在等待）
- 两种问题都有可能出现饥饿，比如读者源源不断的来，按照第一种方法的写者就写不动永远。写者源源不断的来，后面来的读者就无法读

##### a）第一类

```c
void writer(void) {
  while (1) {
    P(&w);

    /* Writing here */ 

    V(&w);
  }
}
```

```c
int readcnt;    /* Initially 0 */
sem_t mutex, w; /* Both initially 1 */

void reader(void) {
  while (1) {
    P(&mutex);
    readcnt++;
    if (readcnt == 1) /* First in */
      P(&w);
    V(&mutex);

    /* Reading happens here */

    P(&mutex);
    readcnt--;
    if (readcnt == 0) /* Last out */
      V(&w);
    V(&mutex);
  }
}
```

- 可以看到两个信号量，readcnt代表读者的数量，w代表目标资源。
- 读者读取的时候，会把readcnt++，如果发现自己是**第一个读者**，才会拿走资源的锁
- 读取结束的时候，会把readcnt--，如果发现自己是最后一个读者，就会释放资源的锁。
- 此外对于readcnt的操作，都需要加锁，避免出问题
- write就拿锁就完事了。
- 第二类非常复杂，暂时就没有介绍了。

##### b）案例学习：并发服务器

- 如下图所示
- 为了保证客户端来的时候，不需要经过创建线程的操作，我们只需要开一个线程池就好了，存放在Buffer里面。一旦客户端来了就节约了创建线程的成本
- master thread 这边就通过 accept 不停的产生，它就是 producer 产生 connection FD，
- worker thread 在这边就在 buffer 上面去抢，谁抢到了谁就拿走，拿走就去服务这个clients。这就是我们说的生产者消费者问题
- 然后我们还需要加上统计功能，有一个reader，读取当前这个 web server 一共服务了多少个client，服务了多少数据，产生了多少网络的流量，做一个统计，worker thread 都是写。这就是ReadWrite的情况。
- 和我们之前最大的区别就是，线程预先创建了，等待客户端来。

![截屏2023-05-09 17.27.18](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-05-09%2017.27.18.png)

#### 4）并行程序

- 把所有的程序分成串行程序和并发程序，我们叫做concurrent，而并发程序的定义是说他们的生命周期是会有 overleap 的。比如说我们 multi thread 的这个可靠用的程序，一个 thread 没有执行完，另外一个 thread 也在执行，他们的生命周期有重叠就称为concurrent。
- parallel program是并发程序的一种，一般把这个翻译成并行，并行就是两个程序是会或两个时代的，是会同时执行的，而并发只是说生命周期有overlap，
- 并发程序需要硬件能有多个，支持同时执行。

> 并行程序一定比普通的快吗？
>
> - 不是的，如果频繁的加锁、解锁，就会出现性能开销。比如我让多个线程做加法，然后加到了全局变量上面，反而会带来加锁、解锁的开销。
>
> ```c
> for (i = start; i < end; i++) {
>  	p(&mutex) ;
>   gsum += i;
>   V(&mutex);
> }
> ```
>
> - 例如上面的程序就是不好，多个线程同时修改全局变量，不好！所以：
>
> ```c
> for (i = start; i < end; i++) {
>    psum[myid] + = i ;		
> }
> ```
>
> - 每个线程单独计算自己的和（这时候性能取决于硬件的核心数）然后发现，这个里面在不断读内存！继续优化：
>
> ```
> for (i = start; i < end; i++) {
>   sum += i;
> }
> ```
>
> - 这时候变量存在寄存器，更快了！

#### 5）并行程序的评估

- $S_p = \frac{T_1}{T_p}$
- 直接测试的话，它其实是某一个硬件平台上面测试的结果，换个机器可能就千差万别。所以需要统一的标准。
- speed up 就是你的这个性能提升的这个比例，T1代表在单核心的机器上执行的时间，Tp代表多核心（p个核心）的执行时间
- $E_p=\frac{S_p}{p} = \frac{T_1}{pT_p}$
- Ep的值最高是1，也就是说，这个是最理想的，只有多线程充分利用了核心，处理器n倍后，时间变成原来的1/n
- 但是实际上多核心的时候有一些损耗，从单线程到双线程，不可能时间完全是原来的1/2，在一个线程等待另外一个线程的时候肯定要浪费时间
- 当线程的数量超过CPU核心的数量，时间反而会变长，因为线程换进换出，反而浪费了时间

#### 6）线程安全

- 并行的时候程序出错，很多时候都是因为调用了函数不是线程安全的函数，线程安全的函数的定义是要满足下面的条件
- 当且仅当：一个函数从多个并发线程重复调用时总是能产生正确的结果，这才是线程安全的函数

- 上面的这个概念很抽象，所以我们一般通过Unsafe的规则来判断，如果出现下面的问题，就是Unsafe

  - Failing to protect shared variables：没有保护共享变量（比如全局变量、静态变量）解决方法：根据情况加锁就可以了！PV函数。但是缺点就是并行的力度降低了，执行时间变长了。

  - Relying on persistent state across invocations：依赖了持久化的状态

    ```c
    unsigned int next = 1;
    /* rand – return pseudo-random int on 0..32767 */
    int rand(void) 
    {
        next = next * 110351524 + 12345 ;
        return (unsigned int)((next/65536) % 32768);
    }
    /* srand – set seed for rand() */
    void srand(unsigned int seed)
    {
        next = seed;
    }
    
    ```

    上面的例子里面，就会发现依赖了持久化的状态next。解决方法：每个线程要有自己的内部的变量。如果用PV操作加锁解锁，那是肯定不行的，因为next变量会被别人改了，然后会收到影响。缺点：调用的函数签名可能要改。`rand_v(int *seed)`，调用者主动提供seed这个变量。

  - Returning a pointer to a static variable：返回了一个指针

    ```c
    char *ctime(const time_t *timep)
    {
        static char *p;
        <get current time and converted to string>
        return &p;
    }
    
    ```

    看这样一个函数，为什么它的代码会返回一个静态局部变量。同样的一个功能的代码，它有串行版本和并行版本，那么往往我们会发现串行版本它不能直接并变成并行版本，是因为串行版本为了优化，为了提升性能，它会做一些奇怪的事情。这个函数的作用是将一个 time 类型的转换成一个字符串，为了避免分配空间、释放空间这种浪费时间的操作，他索性把变量放在静态变量，就不需要反复分配、释放空间。这样多线程的时候就挂了。修改方法：调用者主动转递一个指针，分配好空间，然后我就拷贝就完事了。【缺点：改接口】

    ```c
    char *ctime_ts (const time_t timep, char *privatep) 
    {
        char *sharedp;
    
        P(&mutex);
        sharedp = ctime(timep);
        strcpy(privatep, sharedp) ;
        V(&mutex);
        return privatep;
    }
    
    ```

    或者用PV操作，增加一个拷贝，在出临界区之前，把东西拷走。

  - Calling thread-unsafe functions，自己调用了线程不安全的函数，那显然就不安全了。解决方法：自己换线程安全的版本

#### 7）reentrant可重入

- 可重入的函数就是他自己不会访问共享变量，是线程安全的重要的一个子集，不需要加锁
- 效果如下图所示：

![截屏2023-05-10 15.40.47](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-05-10%2015.40.47.png)

#### 8）Thread local storage

- Thread_local的意思就是，下面的代码里面的I变量，每个线程都有一个自己的拷贝。比如线程1你可以理解为i1、线程2可以理解为i2。
- 输出的结果只可能是 "2340", "3240", "4230", "4320", "2430" or "3420"
- 如果你尝试在每个线程里面打印i的地址，就会发现他们其实都是不一样的！
- 这是C++11的新特性，好处就是避免了你每次调用的时候，手动传递参数（分配好了的空间）进去。

```c
thread_local int i=0;

void f(int newval) {
    i=newval;
}
void g() {
    std::cout<<i;
}
void threadfunc(int id) {
    f(id);
    ++i;
    g();
}


int main() {
    i=0;
    std::thread t1(threadfunc,1);
    std::thread t2(threadfunc,2);
    std::thread t3(threadfunc,3);

    t1.join();
    t2.join();
    t3.join();
    std::cout<<i<<std::endl;
}

```

### 三、经典错误

多线程下面会出现哪些错误呢？一个是Race，一个是死锁

#### 1）Race

- Race竞争，程序的正确性取决于多个线程执行的顺序，谁先执行，谁后执行。其中某一些顺序是正确的，而某一些顺序是不正确的，这就是Data Race

#### 2）DeadLock

- 从起点只能往右边或者上面走，如果是下面图里面的情况，就会出现死锁，进入红色的区域就会死循环
- 例如下图里面两个线程分别拿s0、s1死锁。

```
Tid[0]:
P(s0);
P(s1);
cnt++;
V(s0);
V(s1);
```

```
Tid[1]:
P(s1);
P(s0);
cnt++;
V(s1);
V(s0);
```

- 这个图非常的经典！非常重要！

![截屏2023-05-10 15.53.26](./2-Sync.assets/%E6%88%AA%E5%B1%8F2023-05-10%2015.53.26.png)



