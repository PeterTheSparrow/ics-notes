---
title: 第一节 锁
sidebar_position: 1
---

import OfficePreview from '@site/src/components/OfficePreview/index';

<OfficePreview place = "/ppt/3-15-lock.ppt"/>

## 锁

> 我们实现并行程序里面大量会使用锁，那么我们要关注这些锁是怎么实现的，以及不同锁它的这个表现。最后我们知道性能很大程度上取决于你对于这种共享变量的这个处理，因为不共享的部分大家并行执行都是很好的，性能差的原因往往就是因为共享锁的这个部分。
>
> - Mutex 是一种锁，是一种我们等会介绍的 spin lock
> - 还有Ticket Lock

### 一、Pthread Locks

#### 1）Basic Idea

- critic section 是要限制说能够进入这个空间的 thread 只有一个来保证那个正确
- 锁从它的名字也能看出来，它就像这个门的锁一样，只有一个人开门进去，只有下等它出来了之后，这个锁才能再有一个人进去，所以它的操作会有上锁和开锁，我们称为 lock 和unlock。一把锁来说，它的状态也有两个，一个叫 unlock 的，一个叫lock。

```c
int pthread_mutex_trylock(pthread_mutex_t *mutex);
int pthread_mutex_timedlock(pthread_mutex_t *mutex,
			         struct timespec *abs_timeout);
```

- trylock是立即返回的，如果没有拿到锁
- timedlock会等一段时间然后看，超时了就退出

#### 2）评价锁的好坏

- 第一个它能不能正确的提供 mutual exclusive 或者exclusion，能不能实现排他就是不是正确。
- 第二个会考虑说它是不是一个公平的锁，公平的锁就是有没有先来后到，会不会出现，有的人就是抢不到这把锁，出现starvation，
- 第三个判断依据就是性能，我拿锁的性能如何？

#### 3）单线程的锁

- 我们知道操作系统本身就是个最大的并发的这个程序，虽然他都是他没有多开多线程，但是它里面会有中断，来的时候随时会被打断，最典型的就是 signal handle 了，当时就介绍过一些关闭 signal 因为你不关闭signal，你可能会被打断，调用就会出错。
- 例如下面两个函数关闭了中断

```c
void lock() {
 	DisableInterrupts();
}
void unlock() {
 	EnableInterrupts();
}

```

- 第一个它在多进程底下是不工作的，因为你关了中断只是你当前的这个，另外的thread上面还是会执行，不能支持多核
- 第二个不能关中断太长了，如果再重复来signal，你可能会丢包，如果有其他的硬件的重要的事情，你可能通知不到，
